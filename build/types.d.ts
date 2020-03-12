export interface IInputProvider {
    registerInput(applyInputCb: (input: any) => Promise<any>): void;
}
export interface IOutputProvider {
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
export interface ICorpusProvider {
    corpuses: ICorpusRuleGroup[];
    closures: any[];
}
export interface IClosure {
    name: string;
    handler?(facts: any, context: any): any | Promise<any>;
    rules?: Array<any>;
    options?: object;
}
