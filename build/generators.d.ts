import { IClosure, ICorpusRule } from './types';
/****
 *  closureGenerator
 *  This generates a closure definition
 *  @param name: string - Name of closure
 *  @param handler: (facts:any, context: any) handler - Handler used to run closure
 *  @param options:any - Optional parameter used to define required parameters for closure
 *  @return Returns closure definition
 ****/
export declare function closureGenerator(name: string, handlerOrRules: ICorpusRule[] | ((facts: any, context: any) => any), options?: any): IClosure;
