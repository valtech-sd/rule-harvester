import { IClosure } from '../../types';
import { closureGenerator } from '../../generators';
import _ from 'lodash';
import CoreTransformations from "./transformations";

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
   * @return boolean - true if all field paths match
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
   * @return boolean - true if all field paths match
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
   * fieldInValues - field value is contained in the values array
   * @param context.parameters.fields
   * @return boolean - true if all field paths match
   **/
  closureGenerator(
    'fieldInValues',
    (facts: any, context: any) => {
      let values: Array<any> = context.parameters?.values;
      return _.includes(values, _.get(facts, context.parameters?.field));
    },
    { required: ['field', 'values'] },
  ),
  /**
   * valueInField - value contained in field values array
   * @param context.parameters.fields
   * @return boolean - true if all field paths match
   **/
  closureGenerator(
    'valueInField',
    (facts: any, context: any) => {
      return _.includes(_.get(facts, context.parameters?.field), context.parameters?.value);
    },
    { required: ['field', 'value'] },
  ),
  /**
   * allFieldsTruthy - Returns true if parameter fields truthy
   * example {closure: 'allFieldsTruthy', fields: ['something.name']} - If something.name is truthy (ie exists or set to true)
   * @param context.parameters.fields
   * @return boolean - true if all field paths match
   **/
  closureGenerator(
    'allFieldsTruthy',
    (facts: any, context: any) => {
      let ret = true;
      for (let field of context.parameters.fields) {
        ret = !!_.get(facts, field);
        if (!ret) break;
      }
      return ret;
    },
    { required: ['fields'] },
  ),
  /**
   * allFieldsFalsy - Returns false if parameter fields are falsy
   * example {closure: 'allFieldsFalsy', fields: ['something.name']} - If something.name is false or non-existent
   * @param context.parameters.fields
   * @return boolean - true if all field paths match
   **/
  closureGenerator(
    'allFieldsFalsy',
    (facts: any, context: any) => {
      let ret = true;
      for (let field of context.parameters.fields) {
        ret = !_.get(facts, field);
        if (!ret) break;
      }
      return ret;
    },
    { required: ['fields'] },
  ),
  /**
   * allFieldsUndefined - Returns true if parameter fields are undefined
   * example {closure: 'allFieldsUndefined', fields: ['something.name']} - If something.name is undefined
   * @param any number of params
   * @return boolean - true if all field paths match
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
   * allParametersMatch
   * example {closure: 'allParametersMatch', 'something.name': 'test'} - If something.name is test then reutnrs true
   * @param context.parameters.fields
   * @return boolean - true if all field paths match
   **/
  closureGenerator('allParametersMatch', (facts: any, context: any) => {
    let ret = true;
    for (let field of Object.keys(context.parameters)) {
      ret = _.get(facts, field) === context.parameters[field];
      if (!ret) break;
    }
    return ret;
  }),
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