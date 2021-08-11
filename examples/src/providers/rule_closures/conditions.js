const _ = require('lodash');

// These are just example conditional closures
module.exports = [
  {
    /**
     * always
     * @return true always
     **/
    name: 'always',
    handler(facts, context) {
      return true;
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
     * checkProductType
     * example {closure: "checkProductType", type: 'digital'} - If product type is a digital item
     * @param type
     * @return boolean - true if matching type
     **/
    name: 'checkProductType',
    handler(facts, context) {
      return facts.type === context.parameters.type;
    },
    options: { required: ['type'] },
  },
  {
    /**
     * checkNotProductType
     * example {closure: "checkProductType", type: 'digital'} - If product type is not a digital item
     * @param type
     * @return boolean - true if not matching type
     **/
    name: 'checkNotProductType',
    handler(facts, context) {
      return facts.type !== context.parameters.type;
    },
    options: { required: ['type'] },
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
