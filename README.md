# Rules Harvester

[![CircleCI](https://circleci.com/gh/valtech-sd/rule-harvester.svg?style=svg)](https://circleci.com/gh/valtech-sd/rule-harvester)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg)](https://github.com/ellerbrock/typescript-badges/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


## Overview

Rule Harvester is a general purpose rules engine. It processes rule definitions and allows for a highly configurable rules engine with custom inputs and outpus. This package makes heavy use of [Rules.Js](https://github.com/bluealba/rules-js). We have a desire to use some specific patterns and as a result we have decided to build our own rule harvester based off of Rules.Js. 

## What is a Rules Engine?

The most obvious thing is that this will allow you to do is run rules. It will allow you to use an event source (by way of the input provider) to input data into the same set of rules. Each rules will modify the input as it sees fit and in the end will provide a single output. During that process, it is possible to run any number of asynchronous or synchronous function calls.

## Features
- Chainable Rules where each rule modifies the input for another rule to make use of.
- Define rules using JSON.
- Add any number of closures (functions) to the rules engine.
- Use any number of custom javascript functions within your conditions or actions.
- Simple syntax with lots of flexibility.
- Nested conditions.

## TL:DR;

Jump straight to our [example](#Example) to get started right away!

## Terms/Syntax

There is a need to define terms and syntax

### Facts

Facts are the terminology we use to refer to the data that the rules engine currently holds. When a blob of data is first passed to the rule harvester, that input is the start of those facts. This can just be a string but in most cases facts will be a JSON object of some sort. Each rule will then act on a fact and modify it in whatever way is needed. 

### Input providers

Input providers are what send input into the rule harvester. That input becomes the start of the facts that will be processed while running the rules. An input provider must contain the function `registerInput(applyInputCb)` where applyInputCb is passed in from the ruleHarvester to the input provider and is called by the input provider to run facts against your rules. applyInputCb can take facts and a runtime context as arguments. runtimeContext extends the context when calling closures. If the runtimeContext contains `{testValue: 1}` then the context that is passed into a closure will contain `context.testvalue = 1`. This is useful for passing something like a specialty logger that needs to log some sort of run specific context.

### Output providers

Output providers receive the final output from the input provider. In some cases it may write a file based on the output facts. In other cases, it may do an http REST call of some sort. An output provider must contain the function `outputResult({ facts, error, errorGroup })` where facts is the output fact.

### Closures

Closures are functions that can be called from within a rule. All closures need to be defined by the calling system. Those closures will then be passed into the rule harvester during initialization.

The following would just set a sale tax percentage value inside the facts object.

```javascript
[
  {
    name: 'setSalesTaxPercentage',
    handler(facts, context) {
      facts.setSalesTaxPercentage = context.parameters.percentage
      return facts;
    },
    options: { required: ['percentage'] },
  }
]
```

### Rules

A rule is the smallest piece that will used to define what the rules harvester does.

The following is one way to define them.

```javascript
{ 
    when: [{closure: "checkProductType", type: "digital"}],
    then: [
        {closure: "calculateTaxes" }
        {closure: "calculateTotalPrice" }
    ] 
}
```

Alternatively the above rule definition could be simplified to...

```javascript
{ 
    when: {closure: "checkProductType", type: "digital"},
    then: [
        "calculateTaxes"
        "calculateTotalPrice"
    ]
}
```

Though the above example is rather useless it can allow you to easily see the rule syntax 

#### Closure as a Parameter to another Closure

A closure can support being passed the name of another closure as a Parameter. This is similar to how JavaScript functions can 
receive functions as arguments.

In order to pass a closure as a parameter you need to use **options** when setting up the main closure. For example:

```javascript
[
   {
      /**
       * setSalesTaxPercentage
       * Set the sales tax percentage, by calling ANOTHER closure, whose name is passed in as a parameter
       * to this closure! The passed in closure must be defined, of course!
       * @param - facts
       * @param - context
       * @return - Set the salesTaxPercentage in the facts
       **/
      name: 'setSalesTaxPercentage', // 1
      // 2
      options: {
         closureParameters: ['percentClosureName'],
      },
      handler(facts, context) {
         // 3
         facts.salesTaxPercentage = context.parameters.percentClosureName.process(
             facts,
             context
         );
         return facts;
      },
   },
   {
      /**
       * getSalesTaxPercentageFl
       * Get the sales tax percentage for Florida
       * @param - facts
       * @param - context
       * @return - The salesTaxPercentage for Florida
       **/
      name: 'getSalesTaxPercentageFl', // 4
      handler(facts, context) {
         return 6.0;
      },
   },
   {
      /**
       * getSalesTaxPercentageCa
       * Get the sales tax percentage for California
       * @param - facts
       * @param - context
       * @return - The salesTaxPercentage for California
       **/
      name: 'getSalesTaxPercentageCa', // 5
      handler(facts, context) {
         return 7.5;
      },
   },
]
```

In the above example: (Match the numbers below in the code above)
1. **setSalesTaxPercentage** is our main closure for setting the Sales Tax percent. We are going to set it by calling
   another closure for each state.
1. Notice how in this main closure, you set `options` so that the engine recognizes the parameter `percentClosureName` 
   as a closure and loads it at runtime.
1. Also note how you have to use a special syntax to "call" the parameter closure. We use the method `.process(facts, contaxt)` to
   call the underlying closure and fetch results.
1. In this section we declare our state specific closure for Florida. Note how it just returns a primitive in our case, 
   specifically the Sales Tax rate as a number!
1. Similarly, we declare our state specific closure for California. Similar to the Florida closure, this too just returns
   a number!

#### Path Parameters De-referencing (^)

Until this point, you've passed static values, like strings and numbers, to closures as parameters. What if you
want to reference a fact property for a comparison? This is where de-referencing comes in!

You can use the caret character (`^`), sometimes called a "hat", to start a property name to specify that the parameter
value should be treated as a path in the facts object instead of a static value. 

To illustrate this, let's start from this fact:
```json
{
    "product": "AwesomeEbookOfSomeSort",
    "shipping": {
        "street": "123 sweet st.",
        "city": "San Diego",
        "state": "CA",
        "zip": "12345"
    },
    "name": "Fred Jones",
    "email": "fred@testsite.com",
    "type": "digital",
    "price": 240.00
}
```

If you wanted to run a rule if `type` === "digital", you would represent it as follows:

```javascript
{ 
    when: [{closure: "equal", value1: "^type", value2: "digital"}],
    then: [
       //... include other rules here ...
    ] 
}
```

In the above, the `equal` closure (not included in the example, just presented here for illustration purposes) will 
be called and passed the **value** of your Facts object for the property `type` and the string "digital". The `equal` 
closure, as the name implies, returns true/false based on the equality of the two passed values.

##### Deep De-referencing With Objects

The following is an example of deep de-referencing with an object. Notice how the top level salesArguments must have a 
hat (^) and the field key within that object must have the leading hat (^).

```javascript
{ 
    when: [{closure: "checkProductType", type: "digital"}],
    then: [
        {closure: "salesTaxPercentage", "^salesArguments": { "^percentage" : "percentage.digital" } }
    ] 
}
```

The following is an example of deep de-referencing with an array. In the following example "salesOneCalculation.value" would be dereferenced but 123 would not be. With arrays the value must have a leading hat (^) for the nested parameter to be dereferenced. Note also, the top level "values" field had to have a leading hat (^).

```javascript
{ 
    when: [{closure: "checkProductType", type: "digital"}],
    then: [
        {closure: "sum" ,"^values": ["^salesOneCalculation.value", 123] }
    ] 
}
```

### Rule Groups

A rules group is simply an array of rules with a name attached. Keep in mind that rule groups act as reducers. Each step modifies the fact for the next rule to work on.

```javascript
{
    name: "process-order",
    rules: [{ 
        when: [{closure: "checkProductType", type: "digital"}],
        then: [
            { closure: "calculateTaxes" },
            { closure: "calculateTotalPrice" }
        ] 
    }]
}
```

### Rules Corpus

A rules corpus is just an array of rule groups. This is what is passed into the rule harvester during initialization. The following is a small example of a rules corpus.

```javascript
[ 
    {
        name: "process-digital-item-orders",
        rules: [{ 
            when: [{closure: "checkProductType", type: "digital"}],
            then: [
                { closure: "setSalesTaxPercentage", percentage: 0 }, 
            ], 
        }]
    },
    // Add more rule groups here
]
```

### Configuration

The package comes with some configuration options.

| Option            | type                    | description                                |
| ----------------- | ----------------------- | ------------------------------------------ |
| provider          | Object                  | An object containing the following options |
| provider.outputs  | Array<IOutputProvider>  | This is an array of output provders        |
| provider.inputs   | Array<IInputProvider>   | This is an array of input providers        |
| provider.corpus   | Array<ICorpusRuleGroup> | This is an array of rule groups            |
| provider.closures | Array<IClosure>         | Array of rule closures                     |
| closureHandlerWrapper | (facts:any, context:any, handler:Function)=>Promise<any>| Wrapper function for all functional closures |


The following shows how this can be configured

```javascript
const RuleHarvester = require('rule-harvester');

let ruleHarvester = new RuleHarvester({
    providers: {
        outputs: [ /* Output Provider */ ],
        inputs: [ /* Input Provier */ ],
        corpus: /* Rules corpus array */
        closures: /* Rules Closures array*/
    }
});

// To actually start the rule harvester do the following
ruleHarvester.start()
```

## Example

This repo provides a full example in the **examples** directory. The following are some snippets out of our example. 
This example will process any JSON files located in `./examples/input_watch_path`. It will load the JSON and pass it 
into the rule harvester. The rule harvester will calculate taxes and total price for the order then the output provider 
will output a txt file in `./examples/output_order_dispatch` that will show the order details.

> **Note:** The full example can be found in the `./examples` directory.

To run the full example:
1. Go to the example directory and run `npm i` to install packages.
1. Then with the dependencies installed, run `npm run start`.
1. Go to the example directory and run `cp example_* input_watch_path/`.
1. You should see several output files in `./examples/output_order_dispatch` that show the output of processing each order.

### Input Provider Example

The following example watches `./examples/input_watch_path` for new files. It then passes the file to the rule harvester and deletes the original file.

```javascript
const chokidar = require('chokidar');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
var path = require('path');

module.exports = class RuleInputProviderFileWatcher {
  // 1
  async registerInput(applyInputCb) { 
    
    const handleEvent = async path => {
      // 2
      const inputStr = await readFile(path); 
      const inputObj = JSON.parse(inputStr.toString());
      inputObj.file = path;
      // 3
      await unlink(path);
      // 4
      await applyInputCb(inputObj);
    };

    // 5
    chokidar
      .watch(path.resolve(__dirname) + '/../../input_watch_path', {ignoreInitial: true})
      .on('add', handleEvent);
  }
};
```

Notes:
1. You declare this class an input provider by implementing the `registerInput` method.
1. The provider will be called when a file is added into the directory being watched. It then reads each file, 
   converts the contents to a JSON object, and adds the file path to json for later use.
1. Once the provider instance is done with the file, it deletes it.
1. Finally, the provider passes the JSON object to the rules harvester where it will become "facts" in the rules 
   processing chain.

### Output Provider Example

After the Rules Engine runs, we have some resulting output which is handed to the output provider.

```javascript
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
var path = require('path');

module.exports = class RuleOutputProviderFile {

  // 1
  async outputResult({ facts, error, errorGroup }) {
    // 2
    await writeFile(
      `${path.resolve(__dirname)}/../../output_order_dispatch/${path.basename(
        facts.file
      )}.txt`,
      facts.orderDispatch
    );

    // 3
    console.log('Facts At Completion', facts);
  }
};
```

Notes:
1. You declare this class an output provider by implementing the `outputResult` method.
1. This class simply writes the orderDispatch string from the `facts` to the ./output_order_dispatch directory as an
   order file.
1. In addition, the class also logs the facts as received to the console.

### Corpus Example

Below is a corpus example. This is where we define what the rules engine actually does with the input facts before 
calling the output. 

Since this library makes heavy use of Rules.js, you can read more details at [Rules.Js](https://github.com/bluealba/rules-js) 
on how to define rules. 

However, here is a primer. Each closure must be defined in our closure array, and the rule-harvester library will add 
that closure to the closure registry. In essence a closure is a function that the corpus definition acts on. Closures 
can be defined with function handlers or as an array of rules similar to how the corpus definitions are defined. Note 
that rules can be nested and when doing so, you can achieve better performance by not repeating multiple conditions
unnecessarily.

```javascript
module.exports = [
   // First validate the order
   {
      name: 'Validate the incoming order',
      rules: [
         {
            when: 'always',
            then: [{ closure: 'validateOrder' }],
         },
      ],
   },
   // Now that we've validated, fire off some rules only for VALID ORDERS
   {
      name: 'process valid orders',
      rules: [
         {
            when: 'orderIsValid',
            then: [
               // Set the Sales Tax for Digital Orders first since those don't have per-state sales tax
               {
                  name: 'process digital item orders',
                  rules: [
                     {
                        when: [{ closure: 'checkProductType', type: 'digital' }],
                        then: [
                           { closure: 'setSalesTaxPercentageFixed', percentage: 0 },
                        ],
                     },
                  ],
               },
               // Next Set the Sales Tax for Non-Digital Orders where we do have to check the state
               {
                  name: 'process non digital item orders',
                  rules: [
                     {
                        when: [{ closure: 'checkNotProductType', type: 'digital' }],
                        then: [
                           // Set the Sales Tax according to the order's state
                           {
                              name: 'process by state',
                              rules: [
                                 {
                                    when: [{ closure: 'checkShippingState', state: 'FL' }],
                                    then: [
                                       {
                                          closure: 'setSalesTaxPercentage',
                                          percentClosureName: 'getSalesTaxPercentageFl',
                                       },
                                    ],
                                 },
                                 {
                                    when: [{ closure: 'checkShippingState', state: 'CA' }],
                                    then: [
                                       {
                                          closure: 'setSalesTaxPercentage',
                                          percentClosureName: 'getSalesTaxPercentageCa',
                                       },
                                    ],
                                 },
                              ],
                           },
                        ],
                     },
                  ],
               },
               // Now that we have Sales Tax set based on the above criteria, we can process the order finally!
               {
                  name: 'Send the Order Bill',
                  rules: [
                     {
                        when: 'always',
                        then: [
                           { closure: 'calculateTaxes' },
                           { closure: 'calculateTotalPrice' },
                           { closure: 'buildOrderDispatch' },
                        ],
                     },
                  ],
               },
            ],
         },
      ],
   },
   // And fire off some rules only for INVALID ORDERS
   {
      name: 'Process invalid Orders',
      rules: [
         {
            when: 'orderIsNotValid',
            then: [{ closure: 'buildOrderDispatch_InvalidOrder' }],
         },
      ],
   },
];
```

This Rule Set does the following with each of the inputs it receives:
1. Calls a validation closure and marks the order as valid or invalid depending on that closure's logic.
1. Processes the order if it's valid (which has nested rules to do a bit more processing)
   1. When the item is a digital item, sets the sales tax to 0% directly.
   1. When the item is non-digital, introduces another nested rule to add sales tax by state.
      1. When the shipping state is FL, set sales tax to whatever the parameter closure getSalesTaxPercentageFl returns.
         1. The getSalesTaxPercentageFl returns 6.0%.
      1. When shipping state is CA, set sales tax to whatever the parameter closure getSalesTaxPercentageCa returns.
         1. The getSalesTaxPercentageCa returns 7.5%.
   1. Still with a valid order, calculates taxes, total price and then builds an order dispatch.
1. Alternatively, processes an invalid order which builds an invalid order dispatch.

### Closure Definitions Example

In order for the rules to work, we add closure functions that we reference in the corpus. Closure functions are defined 
using a name, handler, and possibly some options. The handler function takes facts and context as the input and outputs 
the resulting facts. Context can contain parameters that are passed into it. In addition, a corpus can be defined with 
an array of rules similar to how the corpus definitions are defined. Just add a rules[] array field to the closure 
definition and remove the handler function.

For example: setSalesTaxPercentage closure looks like the following. Word of caution: whatever the handler returns 
becomes the new facts. By our convention, the facts are intended to be changed, and we extend the facts at each step. 
Each rule and each group should extend the facts. If null or undefined or some other junk data is inserted 
unintentionally then it could cause the engine to not work as intended. For this reason, all closures should validate 
data to be present before performing actions!

> **Note:** Any closure that changes `facts` must also return the changed `facts` object, otherwise, the modification 
> will not be seen in the rules that follow!

```javascript
module.exports = [
   {
      /**
       * setSalesTaxPercentageFixed
       * Set the sales tax percentage to a fixed value passed into the closure.
       * @param - facts
       * @param - context
       * @return - Set the salesTaxPercentage in the facts
       **/
      name: 'setSalesTaxPercentageFixed',
      handler(facts, context) {
         facts.salesTaxPercentage = context.parameters.percentage;
         return facts;
      },
   },
  // Other closures defined here
]
```

> **Note:** It is also possible for a closure to receive not just static parameters (like 'percentage' above) but also
> a reference to another closure to use inside the main closure. See [Closure as a Parameter to another Closure](#closure-as-a-parameter-to-another-closure).

### Configuration example

The following is an example of how to configure the rule harvester

```javascript
const { default: RuleHarvester } = require('rule-harvester');
// Import all providers

let ruleHarvester = new RuleHarvester({
  providers: {
    inputs: [new RuleInputProviderDirectoryWatcher()],
    outputs: [new RuleOutputProviderFile()],
    corpus: ruleCorpus,
    closures: ruleClosures,
    logger: logger,
  },
});

ruleHarvester.start();
```

## Rule Harvester Internals

In this section, we call out interesting implementation details of Rule Harvester.

### Injecting Context into Inputs, Outputs, and Closures

In some cases, it's helpful to be able to inject context into a closure that lies outside of Facts from an input provider. 
For example, for a logger with specific context info. This is data that really does not fit in the facts object but are 
helpful from the context of the closures and even any Output providers. Rules-js does not have this functionality, so 
Rule Harvester wraps the facts object, closure functions and inputs/outputs with some extra context. This is then unwrapped 
and exposed as needed, especially when interfacing with Rules-js.

For instance, in the **example** provided in this repo, we use context to hold the "name" of the order file being 
processed. Here is what that looks like in the input provider:

```javascript
// Add context to input so we can store the file path of the order file
let context = {orderFile: path}; // 1

// Other code ommitted here

// Pass to rules harvester ("inputObj" will be passed as "facts" to the rules engine).
await applyInputCb(inputObj, context); // 2
```

Note:
1. We create a context variable to hold a context object of our choice. This can be anything we want it to be. An object
   is most useful, but it could theoretically be a primitive!
1. We then pass that context into the method `applyInputCb()` along with our `inputObj` (which becomes our `facts` into
   the rules engine) and the `context` we just created.
   
With this in place, the context is then exposed to each and every closure. For example:

```javascript
module.exports = [
   {
      name: 'someFancyClosure',
      handler(facts, context) {
         // Act on your facts, note `context` is available here! You can use it in updating facts, performing logic, etc. 
         return facts;
      },
   },
   // Other closures defined here
]
```

Similarly, context is passed into Outputs as well. For example:

```javascript
  async outputResult({ facts, error, errorGroup, context }) {
    // Note facts, context and other items are exposed here as well! 
  }
```

### ruleGroupOverrides

// TODO: Add a description of how a certain Input can call for a specific named Rule Group.
// TODO: Add as an example.

## License

Rules Harvester uses an MIT license. Please refer to the license [here](LICENSE.md).
