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
- Chainable Rules where each rules modifies the input for another rule to make use of
- Define rules using JSON
- Add any number of closures (functions) to the rules engine for use
- Use any number of custom javascript functions within your conditions or actions.
- Simple syntax with lots of flexibility
- Nested conditions

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

#### Closure Parameters

In order to use closure parameters you need to use options when setting up a closure. In the following example `calculatePercentage` is a closure parameter. You will want to pass both `facts` and `context` into the closure arguments.

```javascript
[
  {
    name: 'setSalesTaxPercentage',
    handler(facts, context) {
      facts.setSalesTaxPercentage = context.parameters.calculatePercentage(facts, context);
      return facts;
    },
    options: { required: ['calculatePercentage'], closureParameters: ['calculatePercentage'] },
  }
]
```

#### Path Parameters Dereferencing (^)

Use `^` to specify that the parameter value should be treated as a path in the facts object. 

In the following example, `percentages.digital` is a path contained in the facts object. The parameters gets to the function handler as `percentage` without the leading `^` character and the value of `percentage` will equal `facts.percentage.digital`. If `facts.percentage.digital = 0.1` then when the `saleTaxPercentage` closure is called it will have `context.parameters.percentage` value be `0.1`

```javascript
{ 
    when: [{closure: "checkProductType", type: "digital"}],
    then: [
        {closure: "salesTaxPercentage" , "^percentage": 'percentages.digital' }
        {closure: "calculateTaxes" }
        {closure: "calculateTotalPrice" }
    ] 
}
```

##### Deep Dereferencing With Objects

The following is an example of deep dereferencing with an object. Notice how the top level salesArguments must have a hat (^) and the field key within that object must have the leading hat (^).

```javascript
{ 
    when: [{closure: "checkProductType", type: "digital"}],
    then: [
        {closure: "salesTaxPercentage" ,"^salesArguments": { "^percentage": "percentage.digital" } }
    ] 
}
```

The following is an example of deep dereferencing with an array. In the following example "salesOneCalculation.value" would be dereferenced but 123 would not be. With arrays the value must have a leading hat (^) for the nested parameter to be dereferenced. Note also, the top level "values" field had to have a leading hat (^).

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

The following is some snippets out of our example. This example will process any JSON files located in `./examples/input_watch_path`. It will load the JSON and pass it into the rule harvester. The rule harvester will calculate taxes and total price for the order then the output provider will output a txt file in `./examples/output_order_dispatch` that will show the order details.

> **Note:** The full example can be found in the `./examples` directory.

To run the full example...
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
1. registerInput is what makes this an input provider.
1. This provider is notified of added files in a directory, reads each file, converts the contents to a JSON object, 
   and adds the file path to json for later use.
1. Once it's done with the file, it deletes it.
1. Finally the JSON object is passed to the rules harvester where it will become "facts" in the rules processing.

### Output Provider Example

After the Rules Engine runs, we have some resulting output. This output provider is passed the output for handling.

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
1. outputResult is what makes this an output provider
1. write the orderDispatch string to the ./output_order_dispatch directory.
1. Just log the facts at rule completion.

### Corpus Definitions Example

This is the corpus definition. This is where we define what the rules engine actually does. More details can be found 
at [Rules.Js](https://github.com/bluealba/rules-js) on how rules are defined. Each closure must be defined in our 
closure array, and the rule-harvester library will add that closure to the closure registry. In essence a closure is a 
function that the corpus definition acts on. Closures can be defined with function handlers or as an array of rules 
similar to how the corpus definitions are defined.

```javascript
module.exports = [
  {
    name: 'mark-all-orders-invalid-in-prep-for-validation',
    rules: [
      {
        when: 'always',
        then: [{ closure: 'setOrderValidity', validOrder: false }],
      },
    ],
  },
  {
    name: 'validate-incoming-order',
    rules: [
      {
        when: [{ closure: 'orderPassesValidation'}],
        then: [{ closure: 'setOrderValidity', validOrder: true }],
      },
    ],
  },
  {
    name: 'process-digital-item-orders',
    rules: [
      {
        when: [
          { closure: 'checkProductType', type: 'digital' },
          { closure: 'orderIsValid' },
        ],
        then: [{ closure: 'setSalesTaxPercentage', percentage: 0 }],
      },
    ],
  },
  {
    name: 'process-other-normal-orders',
    rules: [
      {
        when: [
          { closure: 'checkNotProductType', type: 'digital' },
          { closure: 'checkShippingState', state: 'FL' },
          { closure: 'orderIsValid' },
        ],
        then: [{ closure: 'setSalesTaxPercentage', percentage: 6 }],
      },
      {
        when: [
          { closure: 'checkNotProductType', type: 'digital' },
          { closure: 'checkShippingState', state: 'CA' },
          { closure: 'orderIsValid' },
        ],
        then: [{ closure: 'setSalesTaxPercentage', percentage: 7.5 }],
      },
    ],
  },
  {
    name: 'send-order-bill',
    rules: [
      {
        when: 'orderIsValid',
        then: [
          { closure: 'calculateTaxes' },
          { closure: 'calculateTotalPrice' },
          { closure: 'buildOrderDispatch' },
        ],
      },
    ],
  },
  {
    name: 'write-invalid-order-file',
    rules: [
      {
        when: 'orderIsNotValid',
        then: [
          { closure: 'buildOrderDispatch_InvalidOrder' },
        ],
      },
    ],
  },
];
```

This Rule Set does the following with each of the inputs it receives:
1. Marks the order as invalid (in preparation for a validation check).
1. Calls a validation closure and marks the order as valid if that passes.
1. For a valid order, when the item is a digital item then set sales tax to 0%.
2. For a valid order, when the item is not digital, and the shipping state is FL set sales tax to 6%.
1. For a valid order, when the item is not digital, and the shipping state is CA set sales tax to 7.5%.
1. For a valid order, calculates taxes, total price and then builds an order dispatch.
1. For an invalid order, builds an invalid order dispatch.

### Closure Definitions Example

In order for the rules to work, we add closure functions that we reference in the corpus. Closure functions defined 
using a name, handler, and possibly some options. The handler function takes facts and context as the input and outputs 
the resulting facts. Context can contain parameters that are passed into it. In addition, a corpus can be defined with 
an array of rules similar to how the corpus definitions are defined. Just add a rules[] array field to the closure 
definition and remove the handler function.

For example: setSalesTaxPercentage closure looks like the following. Word of caution. Whatever the handler returns 
becomes the new facts. By our convention, the facts are intended to be changed, and we extend the facts at each step. 
Each rule and each group should extend the facts. If null or undefined or some other junk data is inserted 
unintentionally then it could cause the engine not work as intended. For this reason, all closures should validate 
data to be present before performing actions!

```javascript
module.exports = [
  {
    /**
     * setSalesTaxPercentage
     * Set the sales tax percentage
     * @param - facts
     * @param - context
     * @return - Set the salesTaxPercentage in the facts
     **/
    name: 'setSalesTaxPercentage',
    handler(facts, context) {
      facts.salesTaxPercentage = context.parameters.percentage;
      return facts;
    },
    options: { required: ['percentage'] },
  }
  // Other closures defined here
]
```

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

## License

Rules Harvester uses an MIT license. Please refer to the license [here](LICENSE.md).
