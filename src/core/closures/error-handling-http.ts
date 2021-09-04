import { IClosure } from '../../types';
import { closureGenerator } from '../../generators';
import _ from 'lodash';
import { ICoreHttpError } from '../types/http-types';

const closures: IClosure[] = [
  /**
   * throw-http-error
   * throw a CoronadoBridge BridgeError (http error).
   * This is useful in a rules-corpus that is processing HTTP requests coming in via
   * CoreHttpInput (which uses CoronadoBridge).
   */
  closureGenerator(
    'throw-http-error',
    function (_facts: any, context: any) {
      let error: any = new ICoreHttpError(
        context.parameters.httpStatusCode,
        context.parameters.errorMessage,
        context.parameters.errorName
      );
      throw error;
    },
    { required: ['httpStatusCode', 'errorMessage', 'errorName'] }
  ),
];

export default closures;
