const { default: RulesHarvester } = require('rule-harvester');
const RuleInputProviderFileWatcher = require('./providers/rule_input_file_watcher');
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosuresProvider = require('./providers/rule_closures_provider');
const ruleCorpusesProvider = require('./providers/rule_corpuses_provider');
const logger = require('./providers/custom-logger');

/**
 * This is just a quick example of how to initialize and start the rules Harvester.
 * Basiclly we pass it various providers
 * Required providers include
 * - ruleInputs: Input providers - Calls a registerd functiuon when input comes in
 * - ruleOutputs: Output providers - A function from this provider is called after rules have been processed
 * - ruleCorpuses: This is the set of corpuses that is used to define what the rules engine does
 * - ruleClosures: This is a list of function definitions that the corpuses use to apply rules
 */
//
let rulesHarvester = new RulesHarvester({
  providers: {
    inputs: [new RuleInputProviderFileWatcher()],
    outputs: [new RuleOutputProviderFile()],
    corpus: ruleCorpusesProvider,
    closures: ruleClosuresProvider,
    logger: logger,
  },
});

rulesHarvester.start();
