import { IInputProvider, IOutputProvider, ICorpusRuleGroup, IClosure } from './types';
import { Logger } from 'log4js';
export interface IRuleHarvesterProviders {
    inputs: IInputProvider[];
    outputs: IOutputProvider[];
    corpus: ICorpusRuleGroup[];
    closures: IClosure[];
    logger?: Logger;
}
export interface IRuleHarvesterConfig {
    providers: IRuleHarvesterProviders;
    extraContext?: object | null;
    closureHandlerWrapper?: (facts: any, context: any, handler: (facts: any, context: any) => any | Promise<any>) => any | Promise<any>;
}
export * from './types';
export * from './generators';
export default class RuleHarvester {
    providers: IRuleHarvesterProviders;
    config: IRuleHarvesterConfig;
    engine: any;
    logger?: Logger;
    ruleGroups: string[];
    extraContext?: object | null;
    forbidenExtraContext: string[];
    /*****************
     * defaultClosureHandlerWrapper
     * This wraps the closure handler so that we log errors well
     ******************/
    defaultClosureHandlerWrapper(name: string, handler: (facts: any, context: any) => any | Promise<any>, options?: any): (facts: any, context: any) => any | Promise<any>;
    /**
     * closureHandlerWrapper
     * This function is a wrapper to allow us to override the context of closure functions.
     * it wraps the closure handler to supply extra context if the handler is defined.
     *
     * @param closure - The defined closure function
     * @return returns a wrapped closure function
     **/
    private closureHandlerWrapper;
    /**
     * Constructor
     * This function configures the engine.
     * 1. Setup class variables
     * @params config: IRuleHarvesterConfig
     * @returns - None
     **/
    constructor(config: IRuleHarvesterConfig);
    /**
     * Setup
     * This function configures the engine.
     * 1. Instantiates the engine
     * 2. Sets up the engine corpus (definitions)
     * 3. Sets of the closers (Available funciton closures for the corpus to work from)
     * @returns - None
     **/
    setup(): void;
    /**
     * start the Rules Harvester.
     * Does this by...
     * 1. Does this by registering an input handler for each rule input
     * 2. Run setup input provider to initialize the rules enigne
     * NOTE: Setup is purposly run after registerInput because the input provider should be able to modify the corpus or configuration during setup
     * @params - None
     * @returns void
     **/
    start(): void;
    /**
     * applyRule - Applies the rule to the rules engine
     * If input is not null then ..
     * 1. Process rules using the rules engine
     * 2. Send the resulting facts to the output providers
     **/
    applyRule(input: any, thisRunContext?: any, ruleGroupOverrides?: string[] | undefined): Promise<any>;
}
