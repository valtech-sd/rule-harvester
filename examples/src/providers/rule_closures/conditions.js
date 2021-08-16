const _ = require('lodash');

// These are just example conditional closures
module.exports = [
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
