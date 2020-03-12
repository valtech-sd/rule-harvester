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
     * isTruthy - Returns true if parameter fields truthy
     * example {closure: isTruthy, fields: ['player.name']} - If player name is truthy (ie exists or set to true)
     * @param any number of params
     * @return boolean - true if all field paths match
     **/
    name: 'isTruthy',
    handler(facts, context) {
      let ret = true;
      for (let field of context.parameters.fields) {
        ret = !!_.get(facts, field);
        if (!ret) break;
      }
      return ret;
    },
    options: { required: ['fields'] },
  },
  {
    /**
     * isFalsey - Returns true if parameter fields are falsy
     * example {closure: isMatch, fields: ['player.name']} - If player name is false or non-existent
     * @param any number of params
     * @return boolean - true if all field paths match
     **/
    name: 'isFalsy',
    handler(facts, context) {
      let ret = true;
      for (let field of context.parameters.fields) {
        ret = !_.get(facts, field);
        if (!ret) break;
      }
      return ret;
    },
    options: { required: ['fields'] },
  },
  {
    /**
     * isFalsey - Returns true if parameter fields are undefined
     * example {closure: isMatch, fields: ['player.name']} - If player name is undefined
     * @param any number of params
     * @return boolean - true if all field paths match
     **/
    name: 'isUndefined',
    handler(facts, context) {
      let ret = true;
      for (let field of context.parameters.fields) {
        ret = _.get(facts, field) === undefined;
        if (!ret) break;
      }
      return ret;
    },
    options: { required: ['fields'] },
  },
  {
    /**
     * isMatch
     * example {closure: isMatch, 'player.name': 'test'} - If player name is test then reutnrs true
     * @param any number of params
     * @return boolean - true if all field paths match
     **/
    name: 'isMatch',
    handler(facts, context) {
      let ret = true;
      for (let field of Object.keys(context.parameters)) {
        ret = _.get(facts, field) === context.parameters[field];
        if (!ret) break;
      }
      return ret;
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
