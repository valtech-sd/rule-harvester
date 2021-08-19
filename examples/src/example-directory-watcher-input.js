/**
 * example-directory-watcher-input
 *
 * This example demonstrates how to create a custom input that watches for new files added to a directory.
 * When it sees files, it then reads the contents and puts the data through the rules engine and eventually one or
 * more outputs.
 *
 */

const { default: RulesHarvester } = require('rule-harvester');
const RuleInputProviderDirectoryWatcher = require('./providers/rule_input_directory_watcher');
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosures = require('./providers/rule_closures');
const ruleCorpus = require('./providers/rule_corpus');
const logger = require('./providers/custom_logger');

/**
 * This is an example of how to initialize and start the Rule Harvester.
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
