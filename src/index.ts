import {
  IInputProvider,
  IOutputResult,
  IOutputProvider,
  ICorpusRuleGroup,
  IClosure,
  ILogger,
} from './types';
//@ts-ignore
import Engine from 'rules-js';
import _ from 'lodash';

export interface IRuleHarvesterProviders {
  inputs: IInputProvider[];
  outputs: IOutputProvider[];
  corpus: ICorpusRuleGroup[];
  closures: IClosure[];
  logger?: ILogger;
}

export interface IRuleHarvesterConfig {
  providers: IRuleHarvesterProviders;
  extraContext?: object | null;
  closureHandlerWrapper?: (
    facts: any,
    context: any,
    handler: (facts: any, context: any) => any | Promise<any>
  ) => any | Promise<any>;
  fieldDereferenceChar?: string;
}

export * from './types';

export * from './generators';

// Export Core Closures, Both as a single export and as individuals for flexibility
export { default as CoreClosures } from './core/closures/index';
export { default as CoreConditionals } from './core/closures/conditionals';
export { default as CoreTransformations } from './core/closures/transformations';
export { default as CoreErrorHandling } from './core/closures/error-handling';
export { default as CoreErrorHandlingHttp } from './core/closures/error-handling-http';

// Export Core Inputs, individually since these are pick-and-choose
export {
  default as CoreInputAmqp,
  ICoreInputAmqpProviderOptions,
} from './core/inputs/amqp-input';

export {
  default as CoreInputHttp,
  ICoreInputHttpProviderOptions,
  CoreInputHttpResponseType,
} from './core/inputs/http-input';

export {
  default as CoreInputUdp,
  ICoreInputUdpProviderOptions,
} from './core/inputs/udp-input';

export {
  default as CoreInputScheduler,
  ICoreInputSchedulerProviderOptions,
} from './core/inputs/scheduler-input';

// Export Core Outputs, individually since these are pick-and-choose
export { default as CoreOutputAmqp } from './core/outputs/amqp-output';
export { default as CoreOutputAmqpRpc } from './core/outputs/amqp-rpc-output';

// Export Core Types that are shared by various components
// AMQP
export * from './core/types/amqp-types';
// HTTP
export * from './core/types/http-types';
// UDP
export * from './core/types/udp-types';
// Scheduler
export * from './core/types/scheduler-types';

// Export RuleHarvester
export default class RuleHarvester {
  providers: IRuleHarvesterProviders;
  config: IRuleHarvesterConfig;
  engine: any;
  logger?: ILogger;
  fieldDereferenceChar: string = '^';
  ruleGroups: string[];
  extraContext?: object | null;
  forbiddenExtraContext: string[] = [
    'engine',
    'parameters',
    'rulesFired',
    'currentRuleFlowActivated',
    'fact',
  ];

  /*****************************
   * Dereference parameters logic
   *******************************/

  /**
   * dereferenceString
   * Pulls a property from facts determined by the path in param.
   * @param facts
   * @param param
   */
  dereferenceString(facts: any, param: string) {
    return _.get(facts, param);
  }

  /**
   * dereferenceArray
   * Pulls an array from facts determined by the path in parameters.
   * @param facts
   * @param parameters
   */
  dereferenceArray(facts: any, parameters: any[]) {
    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      if (_.isString(param) && param.charAt(0) === this.fieldDereferenceChar) {
        const key = param.substr(1);
        parameters[i] = this.dereferenceSingleValue(facts, key);
      } else if (!_.isString(param)) {
        parameters[i] = this.dereferenceSingleValue(facts, param);
      }
    }
    return parameters;
  }

  /**
   * dereferenceSingleValue
   * // TODO: Add a good comment about dereferenceSingleValue
   * @param facts
   * @param originalValue
   */
  dereferenceSingleValue(facts: any, originalValue: any) {
    let newValue = originalValue;
    if (_.isString(originalValue)) {
      newValue = this.dereferenceString(facts, originalValue);
    } else if (_.isArray(originalValue)) {
      newValue = this.dereferenceArray(facts, originalValue);
    } else if (_.isObject(originalValue)) {
      newValue = this.dereferenceObject(facts, originalValue);
    }
    return newValue;
  }

  /**
   * dereferenceObject
   * Used to dereference fields within an object. A field is de-referenced if the key begins with a "^"
   * Call dereferenceSingleValue which does the following
   * - If values are string then get path from facts object
   * - If value is an object then call this recursively
   * - If value is an array then call dereferenceArray
   *   - dereferenceArray uses the leading character of the value to determine if something should be de-referenced or not
   */
  dereferenceObject(facts: any, parameters: any) {
    let parameterKeys = Object.keys(parameters || {});
    for (let i = 0; i < parameterKeys.length; i++) {
      const key = parameterKeys[i];
      if (key.charAt(0) === this.fieldDereferenceChar) {
        const newKey = parameterKeys[i].substr(1);
        const originalValue = parameters[key];
        let newValue = this.dereferenceSingleValue(facts, originalValue);
        parameters[newKey] = newValue;
        delete parameters[key];
      }
    }
    return parameters;
  }

  /**
   * defaultClosureHandlerWrapper
   * This wraps the closure handler so that we log errors well
   *
   * @param name
   * @param handler
   * @param options
   */
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
        // Parse thisRunContext out of facts
        let thisRunContext =
          factsAndOrRunContext?.thisRunContext_RuleHarvesterWrapped;
        let facts;

        const isClosureParameterDirectCall =
          !factsAndOrRunContext?.thisRunContext_RuleHarvesterWrapped;
        // This is to fix a bug for some edge cases where it gets to this wrapper from rules-js function.process(facts,context) calls
        if (thisRunContext || factsAndOrRunContext.facts_RuleHarvesterWrapped) {
          facts = factsAndOrRunContext?.facts_RuleHarvesterWrapped;
          context.rulesFired.thisRunContext_RuleHarvesterWrapped =
            thisRunContext;
        } else {
          facts = factsAndOrRunContext;
        }
        if (
          !thisRunContext &&
          context.rulesFired.thisRunContext_RuleHarvesterWrapped
        ) {
          thisRunContext =
            context.rulesFired.thisRunContext_RuleHarvesterWrapped;
        }
        let contextExt = _.defaults(context, thisRunContext, this.extraContext);
        contextExt.closureName = name;
        contextExt.closureOptions = options;

        contextExt.parameters = this.dereferenceObject(
          facts,
          _.cloneDeep(contextExt.parameters)
        );
        // let parameterKeys = Object.keys(contextExt.parameters || {});
        // for (let i = 0; i < parameterKeys.length; i++) {
        //   const key = parameterKeys[i];
        //   if (key.charAt(0) === this.fieldDereferenceChar) {
        //     const newKey = parameterKeys[i].substr(1);
        //     contextExt.parameters[newKey] = _.get(
        //       facts,
        //       contextExt.parameters[key]
        //     );
        //     delete contextExt.parameters[key];
        //   }
        // }

        result = this.config.closureHandlerWrapper // closureHandlerWrapper exist
          ? await this.config.closureHandlerWrapper(facts, contextExt, handler) // then call wrapper function
          : await handler(facts, contextExt); // else call handler directly

        // If result is undefined then skip this line
        // If this is a a direct call of a closure parameter using the closureParameters functionality then we need to skip this line
        if (result && !isClosureParameterDirectCall) {
          result = {
            facts_RuleHarvesterWrapped: result,
            thisRunContext_RuleHarvesterWrapped: thisRunContext,
          };
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
   * 3. Sets of the closers (Available function closures for the corpus to work from)
   * @returns - None
   **/
  setup() {
    try {
      this.providers = this.config.providers;
      this.logger = this.config.providers.logger;
      this.extraContext = this.config.extraContext;
      this.ruleGroups = [];
      this.fieldDereferenceChar = this.config.fieldDereferenceChar || '^';
      // Make sure extraContext is not using forbidden fields
      let badContext = _.intersection(
        _.keys(this.extraContext),
        this.forbiddenExtraContext
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
   * 2. Run setup input provider to initialize the rules engine
   * NOTE: Setup is purposely run after registerInput because the input provider should be able to modify the corpus
   * or configuration during setup
   *
   * @params - None
   * @returns void
   **/
  start() {
    // We bind to the applyRule to this because otherwise the calling context would
    // be from the input provider instead of the local class
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
          // Loop over groups and set the fact from previous
          // rules group to the input fact for the next rules group
          // thisRunContext + fact is passed in as a single object
          // Our defaultClosureHandlerWrapper above will parse this out
          // and pass facts to the original handler and extend context with thisRunContext
          let factsAndContext: any;
          ({ fact: factsAndContext } = await this.engine.process(group, {
            thisRunContext_RuleHarvesterWrapped: thisRunContext || {},
            facts_RuleHarvesterWrapped: fact,
          }));
          fact = factsAndContext?.facts_RuleHarvesterWrapped; // If undefined facts then we still want to proceed
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
              context: thisRunContext,
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

      // If an error occurred we want to throw it back to the input provider
      if (error) {
        // Throw the error to the input provider
        throw error;
      } else {
        // Alternatively, if no error, we return the altered facts to the input provider also!
        return fact;
      }
    }
  }
}
