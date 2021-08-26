const _ = require('lodash');

// These are just example conditional closures
module.exports = [
  {
    /**
     * invalidOrderFile
     * example {closure: "invalidOrderFile"} - If the order file is not even valid
     * @param type
     * @return boolean - true if the order data is not valid JSON
     **/
    name: 'invalidOrderFile',
    handler(facts, context) {
      try {
        // The Directory Watcher Input just gives us "the order" and the input already
        // ensures it's JSON. So we don't need to repeat.

        // However, the AMQP Input gives us a special object and the property that
        // holds our message `amqpMessage`, and the message content `amqpMessageContent`,
        // could contain anything - even non JSON!
        if (facts.amqpMessage && facts.amqpMessage.amqpMessageContent) {
          // We have an amqpMessage so let's verify the amqpMessageContent is valid JSON.
          // This will THROW if we can't parse the JSON inside the amqp message content.
          JSON.parse(facts.amqpMessage.amqpMessageContent);
          // Note that another closure will take care of reformatting the message!
        }
        return false;
      } catch (ex) {
        return true;
      }
    },
  },
  {
    /**
     * orderIsValid
     * example {closure: "orderIsValid"} - If the order is Valid
     * @param type
     * @return boolean - true if the order is valid
     **/
    name: 'orderIsValid',
    handler(facts, context) {
      return facts.orderIsValid;
    },
  },
  {
    /**
     * orderIsNotValid
     * example {closure: "orderIsNotValid"} - If the order is Valid
     * @param type
     * @return boolean - true if the order is not valid
     **/
    name: 'orderIsNotValid',
    handler(facts, context) {
      return !facts.orderIsValid;
    },
  },
  {
    /**
     * checkShippingAddress
     * @param type
     * @return boolean - true the two parameters passed match!
     **/
    name: 'checkShippingState',
    handler(facts, context) {
      return context.parameters.orderShippingState === context.parameters.state;
    },
    options: { required: ['orderShippingState', 'state'] },
  },
];
