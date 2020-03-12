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

  /**
   * closureHandlerWrapper
   * This function is a wrapper to allow us to override the context of closure functions.
   * it wraps the closure handler to supply extra context if the handler is defined.
   *
   * @param closure - The defined closure function
   * @return returns a wrapped closure function
   **/
  private closureHandlerWrapper(closure: IClosure) {
    if (closure.handler) {
      let handler = closure.handler;
      closure.handler = async (facts: any, context: any) => {
        // _.defaults overrides if a value does not already exist
        // so extraContext cannot override fields that are already defined.
        let result: any;
        try {
          result = await handler(facts, _.defaults(context, this.extraContext));
        } catch (e) {
          if (this.logger) {
            this.logger.error(
              `RuleHarvester - Closure Name: ${closure.name} - Error: `,
              e
            );
          }
        }
        return result;
      };
    }
    return closure;
  }
  /**
   * Constructor
   * This function configures the engine.
   * 1. Instantiates the engine
   * 2. Sets up the engine corpus (definitions)
   * 3. Sets of the closers (Available funciton closures for the corpus to work from)
   * @params config: IRuleHarvesterConfig
   * @returns - None
   **/
  constructor(config: IRuleHarvesterConfig) {
    this.providers = config.providers;
    this.config = config;
    this.logger = config.providers.logger;
    this.extraContext = config.extraContext;
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
    this.extraContext = _.defaults({}, config.extraContext || {}, {
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
    try {
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
          'RuleHarvester - Error during harvester engine setup. Possibly due to naming a non-existing closure',
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
   * @params - None
   * @returns void
   **/
  start() {
    // We bind to the applyRule to this because otherwise the calling context would
    // be from the input provider insetad of the local class
    for (let ruleInput of this.providers.inputs) {
      ruleInput.registerInput(this.applyRule.bind(this));
    }
  }

  /**
   * applyRule - Applies the rule to the rules engine
   * If input is not null then ..
   * 1. Process rules using the rules engine
   * 2. Send the resulting facts to the output providers
   **/
  async applyRule(input: any) {
    if (input) {
      let fact = input;
      let group = input;
      let error = null;
      try {
        for (group of this.ruleGroups) {
          // Loop over grouops and set the fact from previous
          // rules group to the input fact for the next rules grup
          ({ fact } = await this.engine.process(group, fact));
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
      if (error) throw error;
    }
  }
}
