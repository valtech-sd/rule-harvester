import { IClosure } from '../../types';
import { closureGenerator } from '../../generators';
import _ from 'lodash';

// These are just example conditional closures
const closures: IClosure[] = [
  /**
   * always
   * Always true
   */
  closureGenerator(
    'always',
    function (_facts: any, _context: any) {
      return true;
    },
    {},
  ),
  /**
   * equal - value1 === value2
   * @param context.parameters.value1
   * @param context.parameters.value2
   * @return boolean
   **/
  closureGenerator(
    'equal',
    (_facts: any, context: any) => {
      return context.parameters?.value1 === context.parameters?.value2;
    },
    { required: ['value1', 'value2'] },
  ),
  /**
   * not-equal - value1 !== value2
   * @param context.parameters.value1
   * @param context.parameters.value2
   * @return boolean
   **/
  closureGenerator(
    'not-equal',
    (_facts: any, context: any) => {
      return context.parameters?.value1 !== context.parameters?.value2;
    },
    { required: ['value1', 'value2'] },
  ),
  /**
   * contains
   *
   * example: {closure: 'contains', value: "someLongString", contains: 'Long'} - Returns true
   * @param context.parameters.value    - The longer value that will contain another value
   * @param context.parameters.contains - The smaller value that will be contained in "value"
   * @return boolean - True if "contains" is contained in value
   **/
  closureGenerator(
    'contains',
    (_facts: any, context: any) => {
      return (context.parameters?.value || '').includes(context.parameters?.contains);
    },
    { required: ['value', 'contains'] },
  ),
  /**
   * allFieldsDefined - Returns true if all parameter fields are defined (not undefined)
   * example {closure: 'allFieldsDefined', fields: ['something.name']} - If something.name is defined (not undefined)
   * @param any number of params
   * @return boolean
   **/
  closureGenerator(
    'allFieldsDefined',
    (facts: any, context: any) => {
      let ret = true;
      for (let field of context.parameters.fields) {
        ret = _.get(facts, field) !== undefined;
        if (!ret) break;
      }
      return ret;
    },
    { required: ['fields'] },
  ),
  /**
   * allFieldsUndefined - Returns true if all parameter fields are undefined
   * example {closure: 'allFieldsUndefined', fields: ['something.name']} - If something.name is undefined
   * @param any number of params
   * @return boolean
   **/
  closureGenerator(
    'allFieldsUndefined',
    (facts: any, context: any) => {
      let ret = true;
      for (let field of context.parameters.fields) {
        ret = _.get(facts, field) === undefined;
        if (!ret) break;
      }
      return ret;
    },
    { required: ['fields'] },
  ),
  /**
   * not - Revert the closure return value
   * example {closure: 'not' notClosure: 'allFieldsUndefined', fields: ['something.name']} - If something.name is defined
   * @param any number of params
   * @return boolean - true if all field paths match
   **/
  closureGenerator(
    'not',
    async (facts: any, context: any) => {
      return !(await context.parameters.notClosure.process(facts, context));
    },
    { required: ['notClosure'], closureParameters: ['notClosure'] },
  ),
];

export default closures;