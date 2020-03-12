// Interface for the rules input provider
export interface IInputProvider {
  // setup(settings: any): Promise<any>;
  registerInput(applyInputCb: (input: any) => Promise<any>): void;
}

// Interface for the rules output provider
export interface IOutputProvider {
  // setup(settings: any): Promise<any>;
  outputResult(result: any): Promise<any>;
}

export interface ICorpusRuleGroup {
  name: string;
  rules: ICorpusRule[];
}

export interface ICorpusRule {
  when?: string | Object | Object[];
  then?: string | Object | Object[];
}

// Interface for the rules corpus provider
export interface ICorpusProvider {
  corpuses: ICorpusRuleGroup[];
  closures: any[];
}

// Interface for the rules corpus provider
//export interface IRuleCorpusesProvider {
//  corpuses: Object[];
//  closures: any[];
//}

export interface IClosure {
  name: string;
  // Function closure
  handler?(facts: any, context: any): any | Promise<any>;
  rules?: Array<any>;
  options?: object;
}
