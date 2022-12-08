/**
 * example-scheduler-input
 *
 * This example demonstrates how to use the Scheduler Core Input.
 *  This example will periodically check for order files in the input_schedule_path folder and process
 *   those orders accordingly.
 *
 * DEPENDENCIES:
 * - log4js - is a generic logger for NodeJS. See the file ./providers/custom_logger.js for a basic
 *   example of log4js as a replacement to console.log.
 *
 */

// Bring in Package Dependencies
const { v4: uuidv4 } = require('uuid');
const {
  default: RulesHarvester,
  CoreInputScheduler,
} = require('rule-harvester');

// Bring in other Application Specific dependencies
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosures = require('./providers/rule_closures');
const ruleCorpus = require('./providers/rule_corpus_scheduler');
const logger = require('./providers/custom_logger');

const coreScheduledInput = new CoreInputScheduler(
  {
    defaultPerTaskConcurrency: 1,
    defaultMaxPerTaskQueueLength: 100,
    tasks: [
      {
        name: 'Fast Orders',
        intervalText: 'every 15 seconds', // Could use intervalCron as an alternative
        input: {
          directory: 'input_schedule_path/fast',
          outputFilePrefix: 'scheduled-order-fast',
        }, // Passed as part of the input facts in the scheduler
      },
      {
        name: 'Slow Orders',
        intervalText: 'every 60 seconds', // Could use intervalCron as an alternative
        input: {
          directory: 'input_schedule_path/slow', // Directory where order files will be located for this task
          outputFilePrefix: 'scheduled-order-slow',
        }, // Passed as part of the input facts in the scheduler
      },
    ],
  },
  logger,
  {
    // When a new scheduled task is triggered this callback allows us to set the rules engine context
    // This is not necessary in many cases. However, this can be used to calculate a custom value to add
    // to the context for some reason. If using a custom logger, it may be beneficial to add a unique logger to the context for tracing purposes.
    inputContextCallback: (input) => {
      // In this example, this callback receives the full UDP message object.
      // - scheduledTask
      //      name: string;
      //      intervalText?: string;
      //      intervalCron?: string;
      //      input?: any;
      //      queue: {
      //        waiting: number;
      //        pending: number;
      //      };
      return {
        // Construct orderFile from using a UUID and an input parameter that gives us a file prefix
        orderFile: `${input?.input?.outputFilePrefix}-${uuidv4()}`,
      };
    },
  }
);
/**
 * This is an example of how to initialize and start the Rule Harvester with a scheduled Input.
 *
 * Required providers include:
 * - ruleInputs: Input providers -  In this example, a single input provider that starts a scheduler
 *   messages as they are received.
 * - ruleOutputs: Output providers - In this example, a single output provider. This is called after rules have been
 *   processed for a given input and just writes out an order file per valid order.
 * - ruleCorpus: This is the set of corpuses that is used to define what rules are applied to the input.
 * - ruleClosures: This is a list of function definitions available to the rules.
 */
let rulesHarvester = new RulesHarvester({
  providers: {
    inputs: [coreScheduledInput],
    outputs: [new RuleOutputProviderFile()],
    corpus: ruleCorpus,
    closures: ruleClosures,
    logger: logger,
  },
});

rulesHarvester.start();

logger.info(
  `RuleHarvester Example Scheduler INPUT started. Process an order by putting a file  in ./examples/input_scheduler_path/fast or input_scheduler/slow.`
);
logger.info(`Example: cp ./example_ca_order.json ./input_scheduler_path/fast`);
