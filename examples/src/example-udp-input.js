/**
 * example-udp-input
 *
 * This example demonstrates how to use the UDP Core Input

 * DEPENDENCIES:
 * - log4js - is a generic logger for NodeJS. See the file ./providers/custom_logger.js for a basic
 *   example of log4js as a replacement to console.log.
 *
 */

// Bring in Package Dependencies
const { default: RulesHarvester, CoreInputUdp } = require('rule-harvester');

// Bring in other Application Specific dependencies
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosures = require('./providers/rule_closures');
const ruleCorpus = require('./providers/rule_corpus_udp');
const logger = require('./providers/custom_logger');

let udpFileCounter = 0;

const coreUdpInput = new CoreInputUdp([3333], logger, {
  inputContextCallback: (msg) => {
    // In this example, this callback receives the full AMQP-Cacoon message object (of type ConsumeMessage).
    // Our other application logic (the output provider in this case) is expecting
    // the orderFile to be set with a "name" that will be used to output a processed order to the file system.
    return {
      // Construct orderFile from the incoming message fields! For this, we'll just use
      // data coming from the AMQP Broker as an example, but it could be anything!
      orderFile: `udp_order_file-${udpFileCounter++}`,
    };
  },
});
/**
 * This is an example of how to initialize and start the Rule Harvester with an AMQP Input.
 *
 * Required providers include:
 * - ruleInputs: Input providers - In this example, a single input provider that listens to an AMQP queue and consumes
 *   messages as they are received.
 * - ruleOutputs: Output providers - In this example, a single output provider. This is called after rules have been
 *   processed for a given input and just writes out an order file per valid order.
 * - ruleCorpus: This is the set of corpuses that is used to define what rules are applied to the input.
 * - ruleClosures: This is a list of function definitions available to the rules.
 */
let rulesHarvester = new RulesHarvester({
  providers: {
    inputs: [coreUdpInput],
    outputs: [new RuleOutputProviderFile()],
    corpus: ruleCorpus,
    closures: ruleClosures,
    logger: logger,
  },
});

rulesHarvester.start();

logger.info(
  `RuleHarvester Example UDP INPUT started. Send a order via a udp packet then view the output in ./examples/output_order_dispatch.`
);
logger.info(
  `An easy way to send messages by udp if you are on MacOS or linux is to open one a terminal and run a command like the following`
);
logger.info(`cat ./example_ca_order.json | nc -4u -w1 localhost 3333`);
