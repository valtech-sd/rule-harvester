const { default: RulesHarvester } = require('rule-harvester');
const RuleInputProviderDirectoryWatcher = require('./providers/rule_input_directory_watcher');
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosures = require('./providers/rule_closures');
const ruleCorpus = require('./providers/rule_corpus');
const logger = require('./providers/custom-logger');

/**
 * This is just a quick example of how to initialize and start the rules Harvester.
 * Basically we pass it various providers.
 * Required providers include:
 * - ruleInputs: Input providers - In this example, a single input provider that Calls a registered function when new
 *   files are observed in a directory.
 * - ruleOutputs: Output providers - In this example, a single output provider. This is called after rules have been
 *   processed for a given input and just writes out an order file per valid order.
 * - ruleCorpus: This is the set of corpuses that is used to define what rules are applied to the input.
 * - ruleClosures: This is a list of function definitions available to the rules.
 */

let rulesHarvester = new RulesHarvester({
  providers: {
    inputs: [new RuleInputProviderDirectoryWatcher()],
    outputs: [new RuleOutputProviderFile()],
    corpus: ruleCorpus,
    closures: ruleClosures,
    logger: logger,
  },
});

rulesHarvester.start();