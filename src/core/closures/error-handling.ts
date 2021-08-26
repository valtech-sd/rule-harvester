import { IClosure } from '../../types';
import { closureGenerator } from '../../generators';
import _ from 'lodash';

const closures: IClosure[] = [
  /**
   * error
   * throw error
   */
  closureGenerator(
    'throw',
    function (_facts: any, context: any) {
      let error: any = new Error(context.parameters.errorMessage);
      error.name = context.parameters.errorName;
      throw error;
    },
    { required: ['message'] },
  ),
  /**
   * message validation error
   * throw a specific error
   */
  closureGenerator(
    'throw-message-validation-error',
    function (_facts: any, context: any) {
      let error: any = new Error(context.parameters.errorMessage);
      error.name = 'MessageValidationError';
      throw error;
    },
    { required: ['message'] },
  ),
];

export default closures;