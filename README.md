# Rule Harvester

[![CircleCI](https://circleci.com/gh/valtech-sd/rule-harvester.svg?style=svg)](https://circleci.com/gh/valtech-sd/rule-harvester)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg)](https://github.com/ellerbrock/typescript-badges/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Overview

Rule Harvester is a general purpose rules engine. The rules engine receives an input and then processes rule definitions 
against the input, changing that input along the way. Finally, the processed input is passed to an output.

The rules engine includes CORE INPUTS, OUTPUTS and CLOSURES but also supports custom inputs, outputs and closures to
suit any application's unique needs. 

This package makes heavy use of [Rules.Js](https://github.com/bluealba/rules-js). We have a desire to use some specific 
patterns and as a result we have decided to build our own Rule Harvester based off of Rules.Js. 

## What is a Rules Engine?

A Rules Engine allows you to run rules against a piece of data, altering that data as the rules go. It allows you to use 
an event source (by way of the input provider) to input data into the same set of rules. Each rules will modify the input 
as it sees fit and in the end will provide a single output. During that process, it is possible to run any number of 
asynchronous or synchronous function calls.

## Features

- Support for chainable Rules where each rule modifies the input, then subsequent rules received the modified input.
- Rules defined using JSON.
- Support for closures (functions) as part of the rules engine.
- Support for custom javascript functions within your conditions or actions.
- Simple syntax with lots of flexibility.
- Nested conditions.

## TL:DR;

Jump straight to our [example](#Example) to get started right away!

## Terms/Syntax

Let's begin by defining certain terms.

### Facts (input)

The data coming from an input to the Rules Engine are called **Facts**. When a blob of data is passed to the Rule Harvester, that input is the 
start state of the facts. An fact can just be a string but in most cases facts will be a JSON object of some sort. 
Each rule will then act on a fact and modify it as needed. 

### Inputs

Inputs are what send data into the Rule Harvester. The data brought in by the input becomes the start of the facts that 
will be processed while running through the rules. An input provider must contain the function `registerInput(applyInputCb)` 
where `applyInputCb` is passed in from the ruleHarvester to the input provider and is called by the input provider to run 
facts against your rules. `applyInputCb` can take facts and a runtime context as arguments. `runtimeContext` extends the 
context when calling closures. If the `runtimeContext` contains `{testValue: 1}` then the context that is passed into a 
closure will contain `context.testvalue = 1`. This is useful for passing something like a specialty logger that needs to 
log some sort of run specific context.

#### Core Inputs

Rule Harvester includes a number of generic inputs that are useful in various use cases. These are referred to as
Core Inputs. More will be added over time.

The following Core Inputs are available starting with version 2 of Rule Harvester:

- CoreInputAmqp - Establishes a consumer connection to an AMQP Broker Host (RabbitMQ) on a specific Queue. When a message 
  is received in this queue, the message is put through the rules engine. See the example **example-amqp-input.js** for 
  detailed usage.
- CoreInputHttp - Starts an HTTP server on one or more ports then passes any requests into the rules engine. Also, this
  input can respond to the incoming HTTP requests either by waiting for a result from the rules engine or using a static
  response, or even an empty response.

The Rule Harvester maintainers expect to continually be adding to Core Inputs. Because of that, rather than trying
to explain each of the inputs here, you are invited to check out the ./examples/ directory of this repo. Each
core input is covered in an example.

### Outputs

Outputs receive the final modified facts from the Rules Engine. In some cases it may write a file based on the output 
facts. In other cases, it may do an http REST call of some sort. An output provider must contain the 
function `outputResult({ facts, error, errorGroup })` where facts are the output modified facts after all rules
have been processed.

#### Core Outputs

Rule Harvester includes a number of generic outputs that are useful in various use cases. These are referred to as
Core Outputs. More will be added over time.

The following Core Outputs are available:

- CoreOutputAmqp - Allows for the publishing of the result of a rules engine pass into an AMQP broker. When a rules
  pass `result` is received by this output, the output looks for an amqpPublishAction object. If found, it publishes to 
  an Exchange following the details in that object, including being able to set a routing key and other AMQP publish
  options. See the example **example-amqp-output.js** for detailed usage.
- CoreOutputAmqpRpc - This output is only useful when paired with the CoreInputAmqp and allows for the publishing of 
  the result of a rules engine pass into the same AMQP broker where the input came from. When a rules pass `result` is 
  received by this output, the output looks for an amqpRpcPublishAction object. If found, this output then also inspects
  the original received amqpMessage (received via CoreAmqpInput) and looks for `replyTo` and a `correlationId`properties.
  If it finds them, it then publishes to the queue denoted in `replyTo` and assigns the response's property `correlationId`
  to match the value received in the incoming amqpMessage. Note that in some client SDKS (in fact even in RMQ's own
  web management portal) the two properties are passed as `reply_to` and `correlation_id`. However, inside this library
  the values are exposed via Node AMQP Connection Manager as `replyTo` and `correlationId` in the `properties` of an
  AMQP message.

The Rule Harvester maintainers expect to continually be adding to Core Outputs. Because of that, rather than trying
to explain each of the outputs here, you are invited to check out the ./examples/ directory of this repo. Each
core output is covered in an example.

### Closures

Closures are functions that can be called from within a rule. All closures need to be defined by the calling system. 
Those closures will then be passed into the Rule Harvester during initialization.

The following is an example closure that sets a sale tax percentage value inside the facts object.

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

#### Core Closures

Rule Harvester ships with a number of generic closures that are useful in many rules. These are referred to as 
Core Closures. They are broken up into "conditionals" (closures that return a true/false boolean) and "transformations"
(closures that alter facts in some generic way.) 

For example, the project includes an 'always' conditional that will always return true and is useful to have certain
rules that always fire. Also, there is an 'equals' conditional that compares one value to another. You can use these 
closures just like any other closure so long as you've included the Core Closures in your Rule Harvester configuration.
See the section [Configuration example](#configuration-example) in this document to see how to include the Core Closures
in your rules engine instances.

The Rule Harvester maintainers expect to continually be adding to Core Closures. Because of that, rather than trying
to explain each of the closures here, you are invited to check out the ./src/core/closures/ directory of this repo. Each
core closure has a documentation block with example usages.

### Rules

A rule is the smallest piece that will used to define what the Rule Harvester does.

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
 
The above rule would perform a certain action on facts when a certain closure `checkProductType` determines that a
product type is "digital". In this case, the actions would be `calculateTaxes` and `calculateTotalPrice`. All of the 
three items `checkProductType`, `calculateTaxes`, and `calculateTotalPrice` are closures that you get to define.

#### Closures as conditions

When you use a closure in the "when:" clause of a rule, we can say that the closure is a "condition". The output of
closures used in "when:" clauses of rules should be `true` or `false`.

#### Closures as actions

When you use a closure in the "then:" clause of a rule, we can say that the closure is an "action". The output of
closures used in "then:" clauses of rules should be the CHANGED FACTS, which are then passed further downstream to 
other rules. 

An action should change the `facts` object as needed, then return the `facts` object.

#### Closure as a Parameter to another Closure

A closure can support being passed the name of another closure as a Parameter. This is similar to how JavaScript functions can 
receive functions as arguments.

A closure can support Parameters. Similar to how JavaScript functions can receive arguments, these are properties are
passed into the function that implements the closure.

In order to use closure parameters you need to use options when setting up a closure. In the following example 
`calculatePercentage` is a closure parameter. You will want to pass both `facts` and `context` into the closure arguments.

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

You can use the caret character (`^`), sometimes called a "hat", to start the key name to specify that the parameter
value should be treated as a path in the facts object instead of a static value. Because the hat is not allowed in
JSON key names, we also quote it.

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
    "productType": "digital",
    "price": 240.00
}
```

If you wanted to run a rule if `productType` === "digital", you would represent it as follows:

```javascript
{ 
    when: [{closure: "equal", "^value1": "productType", value2: "digital"}],
    then: [
       //... include other rules here ...
    ] 
}
```

In the above, the `equal` closure (part of Rule Harvester core conditional closures) will 
be called and passed the **value** of your Facts object for the property `productType` and the string "digital". The `equal` 
closure, as the name implies, returns true/false based on the equality of the two passed values (in this case a string
and the value held by the productType property.)

Here is another example of a rule and its corresponding closure:

```javascript
when: [
   {
      closure: 'checkShippingState',
      '^orderShippingState': 'shipping.state',
      state: 'CA',
   },
]
```

In the above, the `checkShippingState` closure (declared in /rule_closures/conditions.js) will be called and passed the 
de-referenced **value** of your Facts object for the property `shipping.state`. It is also passed a string ('CA' in this 
case). 

Here is the corresponding closure:

```javascript
  {
    name: 'checkShippingState',
    handler(facts, context) {
      return context.parameters.orderShippingState === context.parameters.state;
    },
    options: { required: ['orderShippingState', 'state'] },
  }
```

The `checkShippingState` closure compares the two passed values (passed via the parameters `orderShippingState` and 
`state`) and returns true if they're equal. The effect is that if a particular's order `shipping.state` matches
the passed state, then the closure returns true.

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

The following is an example of deep de-referencing with an array. In the following example "salesOneCalculation.value" 
would be de-referenced but 123 would not be. With arrays the value must have a leading hat (^) for the nested parameter 
to be de-referenced. Note also, the top level "values" field had to have a leading hat (^).

```javascript
{ 
    when: [{closure: "checkProductType", type: "digital"}],
    then: [
        {closure: "sum" ,"^values": ["^salesOneCalculation.value", 123] }
    ] 
}
```

### Rule Groups

A Rule Group is simply an array of rules with a name attached. Keep in mind that rule groups act as reducers. Each 
step modifies the fact for the next rule to work on.

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

The Rule Corpus is an array of rule groups. This is what is passed into the Rule Harvester during initialization. The 
following is a small example of a Rule Corpus.

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
| provider.outputs  | Array<IOutputProvider>  | This is an array of output providers       |
| provider.inputs   | Array<IInputProvider>   | This is an array of input providers        |
| provider.corpus   | Array<ICorpusRuleGroup> | This is an array of rule groups            |
| provider.closures | Array<IClosure>         | Array of rule closures                     |
| closureHandlerWrapper | (facts:any, context:any, handler:Function)=>Promise<any>| Wrapper function for all functional closures |


The following shows how an instance of the rules engine can be configured:

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

// To actually start the Rule Harvester do the following
ruleHarvester.start()
```

> **Note:** The above configuration does not include [Core Closures](#core-closures) provided by the rules engine. See the section
> [Configuration example](#configuration-example) for how to include Core Closures.

## Example - Directory Watcher

This repo provides a full example in the **examples** directory. The following are some snippets out of our example. 
This example will process any JSON files located in `./examples/input_watch_path`. It will load the JSON and pass it 
into the Rule Harvester. The Rule Harvester will calculate taxes and total price for the order then the output provider 
will output a txt file in `./examples/output_order_dispatch` that will show the order details.

> **Note:** The full example can be found in the `./examples` directory. Also, there are other examples in that 
> directory that are not necessarily discussed here in full. Be sure to check out the `./examples` directory!

To run the full example:
1. Go to the example directory and run `npm i` to install packages.
1. Then with the dependencies installed, run `npm run start`.
1. Go to the example directory and run `cp example_* input_watch_path/`.
1. You should see several output files in `./examples/output_order_dispatch` that show the output of processing each order.

### Input Provider Example

The following example watches `./examples/input_watch_path` for new files. It then passes the file to the Rule Harvester
and deletes the original file.

```javascript
const chokidar = require('chokidar');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const path = require('path');

module.exports = class RuleInputProviderDirectoryWatcher {
   // registerHandler
   // This function is called from the RuleHarvester when start() is called.
   // This is where the RuleHarvester registers itself with this input provider
   async registerInput(applyInputCb) {
      // Event handler for the file watcher
      const handleEvent = async path => {
         try {
            // Read file as string
            const inputStr = await readFile(path);
            console.log(path, inputStr.toString());
            // Convert to json
            const inputObj = JSON.parse(inputStr.toString());
            // Add context to input so we can store the file path of the order file
            let context = {orderFile: path};
            // Delete file
            await unlink(path);
            // Pass to rules harvester ("inputObj" will be passed as "facts" to the rules engine).
            await applyInputCb(inputObj, context);
         } catch (e) {
            console.log('Input Handler Error', e, path);
         }
      };

      // Setup a file watcher
      chokidar
          .watch(path.resolve(__dirname) + '/../../input_watch_path', {ignoreInitial: true})
          .on('add', handleEvent);

      console.log(
          'RuleHarvester Example started. Copy an example order file into ./examples/input_watch_path then view the output in ./examples/output_order_dispatch'
      );
   }
};
```

Notes:
1. You declare this class an input provider by implementing the `registerInput` method.
1. The provider will be called when a file is added into the directory being watched. It then reads each file, 
   converts the contents to a JSON object, and adds the file path to facts context for later use.
1. Once the provider instance is done with the file, it deletes it.
1. Finally, the provider passes the JSON object to the Rule Harvester where it will become `facts` in the rules engine 
   processing chain.

### Output Provider Example

After the Rules Engine runs, we have some resulting output which is handed to the output provider.

```javascript
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const path = require('path');

module.exports = class RuleOutputProviderFile {
   // The rules Harvester will call the outputResult function after it is done processing input
   async outputResult({ facts, error, errorGroup, context }) {
      if (!error) {
         // This writes a file to the ./output_order_dispatch directory
         // It writes an output string that was built during the rule evaluation.
         // Note here we get the file name from the context which was added to the
         // runtime environment by the INPUT PROVIDER.
         await writeFile(
             `${path.resolve(__dirname)}/../../output_order_dispatch/${path.basename(
                 context.orderFile
             )}.txt`,
             facts.orderDispatch
         );
         console.log('Facts At Completion', facts);
      } else {
         console.error(
             'Output Provider - Error during provider run',
             error,
             errorGroup
         );
      }
   }
};

```

Notes:
1. You declare this class an output provider by implementing the `outputResult` method.
1. This class simply writes the orderDispatch string from the `facts` and `context` (for the file path) to the ./output_order_dispatch directory as an
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
/**
 * This is an example rule corpus that processes orders
 **/

module.exports = [
  // First validate the order
  {
    name: 'Validate the incoming order',
    rules: [
      {
        when: 'invalidOrderFile',
        then: [
          {
            closure: 'throw-message-validation-error',
            errorMessage: 'Invalid JSON!',
          },
        ],
      },
      {
        when: 'always',
        then: [
          { closure: 'reformat-amqp-message' },
          { closure: 'validateOrder' },
        ],
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
            // process digital item orders
            when: [
              {
                closure: 'equal',
                '^value1': 'productType',
                value2: 'digital',
              },
            ],
            then: [{ closure: 'setSalesTaxPercentageFixed', percentage: 0 }],
          },
          // Next Set the Sales Tax for Non-Digital Orders where we do have to check the state
          {
            // process non digital item orders
            when: [
              {
                closure: 'not-equal',
                '^value1': 'productType',
                value2: 'digital',
              },
            ],
            then: [
              // Set the Sales Tax according to the order's state
              {
                when: [
                  {
                    closure: 'checkShippingState',
                    '^orderShippingState': 'shipping.state',
                    state: 'FL',
                  },
                ],
                then: [
                  {
                    closure: 'setSalesTaxPercentage',
                    percentClosureName: 'getSalesTaxPercentageFl',
                  },
                ],
              },
              {
                when: [
                  {
                    closure: 'checkShippingState',
                    '^orderShippingState': 'shipping.state',
                    state: 'CA',
                  },
                ],
                then: [
                  {
                    closure: 'setSalesTaxPercentage',
                    percentClosureName: 'getSalesTaxPercentageCa',
                  },
                ],
              },
            ],
          },
          // Now that we have Sales Tax set based on the above criteria, we can process the order finally!
          {
            // 'Send the Order Bill'
            when: 'always',
            then: [
              { closure: 'calculateTaxes' },
              { closure: 'calculateTotalPrice' },
              { closure: 'buildOrderDispatch' },
              { closure: 'prepareAmqpPublishAction' },
              { closure: 'prepareAmqpRpcPublishAction' },
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
        then: [
          { closure: 'buildOrderDispatch_InvalidOrder' },
          { closure: 'prepareAmqpPublishAction' },
        ],
      },
    ],
  },
];
```

This Rule Set does the following with each of the inputs it receives:
1. Calls a validation closure and marks the order as valid or invalid depending on that closure's logic.
1. Processes the order if it's valid (which has nested rules to do a bit more processing)
   1. When the productType is a digital item, sets the sales tax to 0% directly.
   1. When the productType is non-digital, introduces another nested rule to add sales tax by state.
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

For example: `setSalesTaxPercentage` closure looks like the following. Word of caution. Whatever the handler returns 
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

The following is an example of how to configure the Rule Harvester:

```javascript
const { default: RulesHarvester } = require('rule-harvester');
const RuleInputProviderDirectoryWatcher = require('./providers/rule_input_directory_watcher');
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosures = require('./providers/rule_closures');
const ruleCorpus = require('./providers/rule_corpus');
const logger = require('./providers/custom-logger');

let ruleHarvester = new RuleHarvester({
  providers: {
    inputs: [new RuleInputProviderDirectoryWatcher()], // 1
    outputs: [new RuleOutputProviderFile()], // 2
    corpus: ruleCorpus, // 3
    closures: ruleClosures, // 4
    logger: logger, // 5
  },
});

ruleHarvester.start();
```

Note:
1. Our input is the Directory Watcher we discussed above and which we bring in as a "require" from another file.
1. Our output is the file output we discussed above and which we bring in as a "require" from another file.
1. Our corpus is our set of rules, which we also discussed above and which we bring in as a "require" from another file.
1. Our closures parameter is also a "require" from another file, but it bears a little explanation (see below).
1. Finally we provide a logger which just outputs to console.

Our **closures** parameter though is interesting because we combine both custom and [Core Closures](#core-closures) provided by Rule Harvester.

```javascript
// Bring in Core Conditionals and Transformations built into RuleHarvester
const {
  CoreClosures,
  CoreTransformations,
  CoreConditionals,
} = require('rule-harvester');

// Bring our own custom conditions, transformers and actions
const conditions = require('./rule_closures/conditions');
const transformers = require('./rule_closures/transformers');
const actions = require('./rule_closures/actions');

// Combine conditions, transformers and actions into an array that we export so we can use it in the rules engine instance.
module.exports = [].concat(
  // Coming from the Rule-Harvester!
  CoreTransformations,
  CoreConditionals,
  // Custom for the Example
  conditions,
  transformers,
  actions
);
```

Note how Rule Harvester makes available three exports:
- CoreClosures - Is actually a convenience export that includes ALL the closures below! It is meant to be used when
  you want to include all the core closures and don't want to import them individually! Though it is OK to include
  all in the "require" statement, you don't actually want to include both `CoreClosures` and any one of the others. If
  you do, you'll get a runtime error when your engine launches!
- CoreTransformations - Includes generic transformations. See [Core Closures](#core-closures) for more information.
- CoreConditionals - Includes generic conditionals. See [Core Closures](#core-closures) for more information.

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

// Pass to Rule Harvester ("inputObj" will be passed as "facts" to the rules engine).
await applyInputCb(inputObj, context); // 2
```

Note:
1. We create a context variable to hold a context object of our choice. This must be an object although it can take any 
   form of your choice! (See below for a few property names that are not allowed.)
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

**Context property names that are not allowed in Context**

The following properties are not allowed in the root of a context object since they are used already by Rule-Harvester
for other functionality:

- engine
- parameters
- rulesFired
- currentRuleFlowActivated
- fact

### ruleGroupOverrides

// TODO: Add a description of how a certain Input can call for a specific named Rule Group.
// TODO: Add as an example.

## Roadmap TODO

- (high priority) Add a more flexible NACK with Re-Publish to the Core AMQP Input. See TODO in **amqp-input.ts**.
- (medium) Add tests for Core Input AMQP, Core Output AMQP, Core Closures
- (medium) Add tests for Core Input HTTP  
- (low priority, tentative) Consider supporting JSON5 for rules and corpus.

## License

Rule Harvester uses an MIT license. Please refer to the [license file](LICENSE.md) for more details. 
  
  
