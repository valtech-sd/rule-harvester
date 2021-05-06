import { IRuleHarvesterConfig } from './index';
export interface IInputProvider {
    registerInput(applyInputCb: (input: any, runtimeContext?: any, ruleGroupOverrides?: string[]) => Promise<any>, ruleHarvesterConfig?: IRuleHarvesterConfig): void;
}
export interface IOutputProvider {
    outputResult(result: any): Promise<any>;
}
export interface ICorpusRuleGroup {
    name: string;
    config?: any;
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
export declare type ICorpusRule = string | IRuleObject | IRuleBranch;
export interface ICorpusProvider {
    corpuses: ICorpusRuleGroup[];
    closures: any[];
}
export interface IClosure {
    name: string;
    handler?(facts: any, context: any): any | Promise<any>;
    rules?: ICorpusRule[];
    options?: object;
}
