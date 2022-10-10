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
const { v4: uuidv4 } = require('uuid');
const { default: RulesHarvester, CoreInputUdp } = require('rule-harvester');

// Bring in other Application Specific dependencies
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosures = require('./providers/rule_closures');
const ruleCorpus = require('./providers/rule_corpus_udp');
const logger = require('./providers/custom_logger');

const coreUdpInput = new CoreInputUdp([3333], logger, {
  // When a new UDP request is seen, this callback allows you to control how the rules engine context is set for that
  // request. This is not necessary in many cases. However, this can be used to calculate a custom value to add
  // to the context for some reason. If using a custom logger, it may be beneficial to add a unique logger to the context for tracing purposes.
  inputContextCallback: (msg) => {
    // In this example, this callback receives the full UDP message object.
    // - udpRequest
    //   - body: string - The UDP packet body as a string
    //   - remoteInfo: object
    //     - address: string - IP Address of the remote client
    //     - family: 'IPv4' | 'IPv6' - IP Version 6 or 4
    //     - port: number - sender number
    //     - size: number - Size in bytes of the udp packet
    return {
      // We don't do anything with the udpRequest here, but we could if necessary.

      // Construct orderFile from using a UUID
      // Just a random UUID so we have a unique "order file".
      orderFile: `udp-order-${uuidv4()}`,
    };
  },
});
/**
 * This is an example of how to initialize and start the Rule Harvester with an UDP Input. (a UDP server listening on a specific port that passes the received UDP data into the Rules Engine).
 *
 * Required providers include:
 * - ruleInputs: Input providers -  In this example, a single input provider that starts a UDP server on a specific port and passes the UDP data as
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
