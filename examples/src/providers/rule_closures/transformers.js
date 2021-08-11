const _ = require('lodash');

// These are just example closures to transform the data
module.exports = [
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
      facts.salesTaxPercentage =
        await context.parameters.percentClosureName.process(facts, context);
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
    name: 'getSalesTaxPercentageCa',
    handler(facts, context) {
      return 7.5;
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
        facts.productType !== undefined &&
        facts.price !== undefined;
      return facts;
    },
  },
];
