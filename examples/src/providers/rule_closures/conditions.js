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
     * @return boolean - true if not matching type
     **/
    name: 'checkShippingState',
    handler(facts, context) {
      return (
        _.get(facts, 'shipping.state', context.parameters.state) ===
        context.parameters.state
      );
    },
    options: { required: ['state'] },
  },
];
