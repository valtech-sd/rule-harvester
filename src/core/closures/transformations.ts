import { IClosure } from '../../types';
import { closureGenerator } from '../../generators';
import _ from 'lodash';

const closures: IClosure[] = [
  /**
   * concat
   * set facts with some extra values.
   *  example: { closure: 'concat', key: 'some.path', value: 1 } to set facts.some.path = 1
   *  example: { closure: 'concat', key: 'some.path', '^value': 'some.other.path' } to set facts.some.path = facts.some.other.path
   */
  closureGenerator(
    'concat',
    function (facts: any, context: any) {
      let key = context.parameters.key;
      if (key) {
        let keyValue = _.get(facts, key);
        let value = context.parameters.value;
        _.set(facts, key, keyValue + value);
      }
      return facts;
    },
    {},
  ),
  /**
   * set
   * set facts with some extra values.
   *  example: { closure: 'set', key: 'some.path', value: 1 } to set facts.some.path = 1
   *  example: { closure: 'set', key: 'some.path', '^value': 'some.other.path' } to set facts.some.path = facts.some.other.path
   */
  closureGenerator(
    'set',
    function (facts: any, context: any) {
      let key = context.parameters.key;
      let value = context.parameters.value;
      if (key) _.set(facts, key, value);
      return facts;
    },
    {},
  ),
  /**
   * Push
   * Pushes a value onto an array. It is possible to push onto multiple arrays by providing multiple parameters
   *  example: { closure: 'push', key: 'path.to.some.array', value: 1 } - Facts will = {path: {to: { some: {array: [1]}}}} or it may have other values on the array if they were previosuly push to the array
   *  example: { closure: 'push', key: 'path.to.some.array', '^value': 'path.to.some.value' } - The value that will be pushed onto the array will be from 'path.to.some.value'
   */
  closureGenerator(
    'push',
    function (facts: any, context: any) {
      let array = _.get(facts, context.parameters.key);
      let value = context.parameters.value;
      if (!Array.isArray(array)) {
        array = [];
      }
      array.push(value);
      _.set(facts, context.parameters.key, array);
      return facts;
    },
    {},
  ),
];

export default closures;