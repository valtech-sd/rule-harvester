import {
  IInputProvider,
  IOutputProvider,
  ICorpusRuleGroup,
  IClosure,
} from './types';
//@ts-ignore
import Engine from 'rules-js';
import _ from 'lodash';
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
  closureHandlerWrapper?: (
    facts: any,
    context: any,
    handler: (facts: any, context: any) => any | Promise<any>
  ) => any | Promise<any>;
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
  forbidenExtraContext: string[] = [
    'engine',
    'parameters',
    'rulesFired',
    'currentRuleFlowActivated',
    'fact',
  ];

  /*****************
   * defaultClosureHandlerWrapper
   * This wraps the closure handler so that we log errors well
   ******************/
  public defaultClosureHandlerWrapper(
    name: string,
    handler: (facts: any, context: any) => any | Promise<any>,
    options?: any
  ): (facts: any, context: any) => any | Promise<any> {
    return async (factsAndOrRunContext: any, context: any) => {
      // _.defaults overrides if a value does not already exist
      // so extraContext cannot override fields that are already defined.
      let result: any;
      try {
        // Parse thisRunContext outof facts
        let thisRunContext = factsAndOrRunContext?.thisRunContext;
        let facts = factsAndOrRunContext?.facts;

        let contextExt = _.defaults(context, thisRunContext, this.extraContext);
        contextExt.closureName = name;
        contextExt.closureOptions = options;

        result = this.config.closureHandlerWrapper // closureHandlerWrapper exist
          ? await this.config.closureHandlerWrapper(facts, contextExt, handler) // then call wrapper funtion
          : await handler(facts, contextExt); // else call handler directly

        if (result) {
          // If !result then it actually needs to return what was specified
          result = { facts: result, thisRunContext };
        }
      } catch (e) {
        if (this.logger) {
          this.logger.error(
            `RuleHarvester.defaultClosureHandlerWrapper - Closure Name: ${name} - Error: `,
            e
          );
        }
        throw e;
      }
      return result;
    };
  }

  /**
   * closureHandlerWrapper
   * This function is a wrapper to allow us to override the context of closure functions.
   * it wraps the closure handler to supply extra context if the handler is defined.
   *
   * @param closure - The defined closure function
   * @return returns a wrapped closure function
   **/
  private closureHandlerWrapper(closure: IClosure) {
    let result = closure;
    if (closure.handler) {
      result = Object.assign({}, closure);
      result.handler = this.defaultClosureHandlerWrapper(
        closure.name,
        closure.handler,
        closure.options
      );
    }
    return result;
  }
  /**
   * Constructor
   * This function configures the engine.
   * 1. Setup class variables
   * @params config: IRuleHarvesterConfig
   * @returns - None
   **/
  constructor(config: IRuleHarvesterConfig) {
    this.providers = config.providers;
    this.config = config;
    this.logger = config.providers.logger;
    this.extraContext = config.extraContext;
    this.ruleGroups = [];
  }

  /**
   * Setup
   * This function configures the engine.
   * 1. Instantiates the engine
   * 2. Sets up the engine corpus (definitions)
   * 3. Sets of the closers (Available funciton closures for the corpus to work from)
   * @returns - None
   **/
  setup() {
    try {
      this.providers = this.config.providers;
      this.logger = this.config.providers.logger;
      this.extraContext = this.config.extraContext;
      this.ruleGroups = [];
      // Make sure extraContext is not using forbidden fields
      let badContext = _.intersection(
        _.keys(this.extraContext),
        this.forbidenExtraContext
      );
      if ((badContext || []).length > 0) {
        throw new Error(
          `One of the extraContext fields specified is forbidden and could mess with the rules engine. (${badContext.join(
            ', '
          )})`
        );
      }

      // This will be extend the context and be passed into closure handler functions
      this.extraContext = _.defaults({}, this.extraContext || {}, {
        logger: this.logger,
      });

      // Instantiate rules engine
      this.engine = new Engine();
      // Sets up closures for the provider for the rules engine
      for (let closure of this.providers.closures) {
        closure = this.closureHandlerWrapper(closure); // Wraps handler if needed

        if (!closure.handler && closure.name && closure.rules) {
          this.engine.add(closure, closure.options);
        } else {
          this.engine.closures.add(
            closure.name,
            closure.handler,
            closure.options
          );
        }
      }
      // Add corpus definitions to the engine
      for (let corpus of this.providers.corpus) {
        this.ruleGroups.push(corpus.name);
        this.engine.add({
          name: corpus.name,
          rules: corpus.rules,
        });
      }
    } catch (e) {
      if (this.logger) {
        this.logger.fatal(
          'RuleHarvester - Error during harvester engine setup.',
          e
        );
      }
      throw e;
    }
  }

  /**
   * start the Rules Harvester.
   * Does this by...
   * 1. Does this by registering an input handler for each rule input
   * 2. Run setup input provider to initialize the rules enigne
   * NOTE: Setup is purposly run after registerInput because the input provider should be able to modify the corpus or configuration during setup
   * @params - None
   * @returns void
   **/
  start() {
    // We bind to the applyRule to this because otherwise the calling context would
    // be from the input provider insetad of the local class
    for (let ruleInput of this.providers.inputs) {
      ruleInput.registerInput(this.applyRule.bind(this), this.config);
    }
    this.setup();
  }

  /**
   * applyRule - Applies the rule to the rules engine
   * If input is not null then ..
   * 1. Process rules using the rules engine
   * 2. Send the resulting facts to the output providers
   **/
  async applyRule(
    input: any,
    thisRunContext: any = null,
    ruleGroupOverrides: string[] | undefined = undefined
  ) {
    if (input) {
      let fact = input;
      let group = input;
      let error = null;
      try {
        let ruleGroups = ruleGroupOverrides || this.ruleGroups;
        ruleGroups = typeof ruleGroups === 'string' ? [ruleGroups] : ruleGroups;
        for (group of ruleGroups) {
          // Loop over grouops and set the fact from previous
          // rules group to the input fact for the next rules grup
          // thisRunContext + fact is passed in as a single object
          // Our defaultClosureHandlerWrapper above will parse this out
          // and pass facts to the original handler and extend context with thisRunContext
          let factsAndContext: any;
          ({ fact: factsAndContext } = await this.engine.process(group, {
            thisRunContext,
            facts: fact,
          }));
          fact = factsAndContext?.facts; // If undefined facts then we still want to proceed
        }
      } catch (e) {
        error = e;
        if (this.logger) {
          this.logger.error(
            'RuleHarvester - Error: An error occurred while processing rule',
            `GROUP: ${group}, fact: ${JSON.stringify(fact, null, 2)}`,
            e
          );
        }
      }

      try {
        // Make array of promise and wait for all to be done because we
        // want to do these actions in parallel.
        let proms = [];
        for (let output of this.providers.outputs) {
          proms.push(
            output.outputResult({
              facts: fact,
              error,
              errorGroup: error ? group : undefined,
            })
          );
        }
        await Promise.all(proms);
      } catch (e) {
        error = e;
        if (this.logger) {
          this.logger.error(
            'RuleHarvester - Error: An error occurred while processing rule',
            `GROUP: ${group}, fact: ${JSON.stringify(fact, null, 2)}`,
            e
          );
        }
      }

      // If an error occured we want to throw it back to the input provider
      if (error) {
        throw error;
      } else {
        return fact;
      }
    }
  }
}
