const _ = require('lodash');

// These are just example closures to transform the data
module.exports = [
  {
    /**
     * extendFacts
     * Extends field paths to match parameters
     * do this by...
     * 1. Loop through all parameter keys
     * 2. For each key set that value based on the key
     * @param - facts
     * @param - context
     * @return - The facts after they were extended
     **/
    name: 'extendFacts',
    handler(facts, context) {
      for (let field of Object.keys(context.parameters)) {
        _.set(facts, field, context.parameters[field]);
      }
      return facts;
    },
  },
  {
    /**
     * setSalesTaxPercetage
     * Set the sales tax percentage
     * @param - facts
     * @param - context
     * @return - Set the salesTaxPercetage in the facts
     **/
    name: 'setSalesTaxPercetage',
    handler(facts, context) {
      facts.salesTaxPercetage = context.parameters.percentage;
      return facts;
    },
    options: { required: ['percentage'] },
  },
  {
    /**
     * calculateTaxes
     * @param - facts
     * @param - context
     * @return - Add taxes to facts
     **/
    name: 'calculateTaxes',
    handler(facts) {
      // Calculate the taxes
      facts.taxes = facts.price * ((facts.salesTaxPercetage || 0.0) / 100.0);
      return facts;
    },
  },
  {
    /**
     * calculateTotalPrice
     * @param - facts
     * @param - context
     * @return - Add total price to fact
     **/
    name: 'calculateTotalPrice',
    handler(facts) {
      // Calculate the taxes
      facts.total = facts.taxes + facts.price;
      return facts;
    },
  },
];
