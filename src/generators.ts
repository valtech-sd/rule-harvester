import { IClosure, ICorpusRule } from './types';
/****
 *  closureGenerator
 *  This generates a closure definition
 *  @param name: string - Name of closure
 *  @param handlerOrRules: (facts:any, context: any) handler - Handler used to run closure
 *  @param options:any - Optional parameter used to define required parameters for closure
 *  @return Returns closure definition
 ****/
export function closureGenerator(
  name: string,
  handlerOrRules: ICorpusRule[] | ((facts: any, context: any) => any),
  options?: any
): IClosure {
  let closure: IClosure = {
    name,
    options: options,
  };
  if (Array.isArray(handlerOrRules)) {
    closure.rules = handlerOrRules;
  } else {
    closure.handler = handlerOrRules;
  }
  return closure;
}
