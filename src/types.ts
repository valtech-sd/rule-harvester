import { IRuleHarvesterConfig } from './index';
// Interface for the rules input provider
export interface IInputProvider {
  // setup(settings: any): Promise<any>;
  registerInput(
    applyInputCb: (
      input: any,
      runtimeContext?: any,
      ruleGroupOverrides?: string[]
    ) => Promise<any>,
    ruleHarvesterConfig?: IRuleHarvesterConfig
  ): void;
}

// Define what we want Output Result to receive
export interface IOutputResult {
  facts: any;
  error?: any;
  errorGroup?: any;
  context?: any;
}

// Interface for the rules output provider
export interface IOutputProvider {
  // setup(settings: any): Promise<any>;
  outputResult(result: IOutputResult): Promise<any>;
}

export interface ICorpusRuleGroup {
  name: string;
  config?: any; // The Input provider can use this to configure a rule group in custom ways
  rules: ICorpusRule[];
}

export interface IRuleObject {
  closure: string;
  [key: string]: any;
}

export interface IRuleBranch {
  when?: ICorpusRule | ICorpusRule[];
  then?: ICorpusRule | ICorpusRule[];
}

export type ICorpusRule = string | IRuleObject | IRuleBranch;

// Interface for the rules corpus provider
export interface ICorpusProvider {
  corpuses: ICorpusRuleGroup[];
  closures: any[];
}

export interface IClosure {
  name: string;
  // Function closure
  handler?(facts: any, context: any): any | Promise<any>;
  rules?: ICorpusRule[];
  options?: object;
}
