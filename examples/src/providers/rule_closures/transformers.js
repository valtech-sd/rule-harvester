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
  },
  {
    /**
     * calculateTaxes
     * @param - facts
     * @param - context
     * @return - Facts, with added taxes
     **/
    name: 'calculateTaxes',
    handler(facts, context) {
      // Calculate the taxes
      facts.taxes = facts.price * ((facts.salesTaxPercentage || 0.0) / 100.0);
      return facts;
    },
  },
  {
    /**
     * calculateTotalPrice
     * @param - facts
     * @param - context
     * @return - Facts, with the new total price
     **/
    name: 'calculateTotalPrice',
    handler(facts, context) {
      // Calculate the taxes
      facts.total = facts.taxes + facts.price;
      return facts;
    },
  },
  {
    /**
     * validateOrder
     * example {closure: "validateOrder"} - If the order passes validation
     * @param type
     * @return boolean - true if the order passes validation
     **/
    name: 'validateOrder',
    handler(facts, context) {
      // Check that an order has all the required properties.
      // Note, this is better done with JSON Schema but we're just doing a conditional here!
      facts.orderIsValid =
        facts.product &&
        facts.shipping &&
        facts.name &&
        facts.email &&
        facts.type &&
        facts.price;
      return facts;
    },
  },
];
