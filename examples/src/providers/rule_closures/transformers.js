const _ = require('lodash');

// These are just example closures to transform the data
module.exports = [
  // {
  //   /**
  //    * extendFacts
  //    * Extends field paths to match parameters
  //    * do this by...
  //    * 1. Loop through all parameter keys
  //    * 2. For each key set that value based on the key
  //    * @param - facts
  //    * @param - context
  //    * @return - The facts after they were extended
  //    **/
  //   name: 'extendFacts',
  //   handler(facts, context) {
  //     for (let field of Object.keys(context.parameters)) {
  //       _.set(facts, field, context.parameters[field]);
  //     }
  //     return facts;
  //   },
  // },
  {
    /**
     * setSalesTaxPercentage
     * Set the sales tax percentage, by calling ANOTHER closure, whose name is passed in as a parameter
     * to this closure! The passed in closure must be defined, of course!
     * @param - facts
     * @param - context
     * @return - Set the salesTaxPercentage in the facts
     **/
    name: 'setSalesTaxPercentage',
    options: {
      closureParameters: ['percentClosureName'],
    },
    async handler(facts, context) {
      const salesTaxPercentageObject =
        await context.parameters.percentClosureName.process(facts, context);
      facts.salesTaxPercentage = salesTaxPercentageObject.percentage;
      return facts;
    },
  },
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
  {
    /**
     * getSalesTaxPercentageFl
     * Get the sales tax percentage for Florida
     * @param - facts
     * @param - context
     * @return - The salesTaxPercentage for Florida
     **/
    name: 'getSalesTaxPercentageFl',
    handler(facts, context) {
      return { percentage: 6.0 };
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
    name: 'getSalesTaxPercentageCa',
    handler(facts, context) {
      return { percentage: 7.5 };
    },
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
        facts.product !== undefined &&
        facts.shipping !== undefined &&
        facts.name !== undefined &&
        facts.email !== undefined &&
        facts.type !== undefined &&
        facts.price !== undefined;
      return facts;
    },
  },
];
