const _ = require('lodash');

// These are example closures to transform the facts object

module.exports = [
  {
    /**
     * reformat-amqp-message
     * Reformat an incoming AMQP Message by pulling all the message "properties"
     * into the root of the facts object. Why? So we can use the same rules we use for the Directory Watcher Input.
     * @param - facts
     * @param - context
     * @return - facts, updated.
     **/
    name: 'reformat-amqp-message',
    async handler(facts, context) {
      // The AMQP Input gives us a special object. Check to see if this facts object is an AMQP input.
      // If the facts object is not an AMQP input, we don't need to do any work!
      // Note, this is completely application specific. A rules corpus can easily just work with
      // facts.amqpMessage!
      if (facts.amqpMessage) {
        try {
          // We have an amqpMessage so let's do some work to reformat it to make it
          // easier to process with the rules that also process the Directory Watcher Input.
          // First, we parse amqpMessageContent, which we expect to be JSON, into an object.
          const messageContent = JSON.parse(facts.amqpMessage.amqpMessageContent);
          // Next, we parse out the properties of the messageContent into the root of the facts to imitate the
          // same structure we receive from the Directory Watcher Input and so
          // we don't have to keep reaching into amqpMessageContent each time we want to pull a value.
          facts = _.merge(facts, messageContent)
        } catch (e) {
          // Yikes. Something failed, so we throw the special 'MessageValidationError' that the AMQP Input expects
          // to indicate a malformed message.
          const messageValidationError = new Error(e.message);
          messageValidationError.name = 'MessageValidationError';
          throw messageValidationError;
        }
      }
      // Return the changed object (or if it was not an AMQP input, we just return the same facts we received).
      return facts;
    },
  },
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
     * example {closure: "validateOrder"} - Checks the order to ensure it's valid. Also will JSON.parse().
     * @param type
     * @return facts - returns the modified facts
     **/
    name: 'validateOrder',
    handler(facts, context) {
      // Check to see if we have to JSON Parse first (since we could have received a basic string, for example
      // with the AMQP Input!)
      if (typeof facts !== 'object') {
        // We do need to parse facts into an object!
        facts = JSON.parse(facts);
      }
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
