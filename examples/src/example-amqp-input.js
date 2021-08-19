/**
 * example-amqp-input
 *
 * This example demonstrates how to use the AMQP Core Input in order to start a rules engine that
 * subscribes to a RabbitMQ AMQP Host and consumes messages published to a specific queue. It then
 * takes those messages and puts them through the rules engine and eventually generates one or more
 * outputs.
 *
 * DEPENDENCIES:
 * The AMQP Core Input uses 2 other packages, both of which should be installed into your project
 * when you install rule-harvester. These are:
 *
 * - AMQP Cacoon - is a package that manages connections to RabbitMQ.
 * - log4js - is a generic logger for NodeJS. See the file ./providers/custom_logger.js for a basic
 *   example of log4js as a replacement to console.log.
 *
 * IMPORTANT * IMPORTANT * IMPORTANT: BROKER AUTHENTICATION AND TLS
 * This example relies on a secrets.json file for the username, password and CA Certificate name to
 * use when connecting to RabbitMQ. In order to run this example, be sure that you have:
 *
 * - An AMQP RabbitMQ Broker listening on AMQP or AMQPS accessible from your workstation.
 * - Edited amqp-config.js and selected the protocol and port you'll be using to connect to RabbitMQ.
 * - Copy the file ./examples/src/conf/secrets-template.json to secrets.json.
 * - Edit the username, password and CA certificate values in that file to match your broker settings.
 *
 * If you don't have a RabbitMQ broker setup, check out our other repo that provides you a way to stand up
 * a broker using Docker Compose. See https://github.com/valtech-sd/Docker-RabbitMQ.
 *
 */

// Bring in Core Node Dependencies
const util = require('util');

// Bring in Package Dependencies
const { default: RulesHarvester, CoreInputAmqp } = require('rule-harvester');
const AmqpCacoon = require('amqp-cacoon').default;

// Bring in other Application Specific dependencies
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosures = require('./providers/rule_closures');
const ruleCorpus = require('./providers/rule_corpus');
const logger = require('./providers/custom_logger');

// Bring in our AMQP Broker configuration
const amqpConfig = require('./conf/amqp-config');

// Since the AMQP Input requires an AMQP Cacoon object, let's start by creating that.
// AMQP Cacoon is a library that makes it easy to connect to RabbitMQ.
let amqpCacoon = new AmqpCacoon({
  protocol: amqpConfig.protocol,
  username: amqpConfig.username,
  password: amqpConfig.password,
  host: amqpConfig.host,
  port: amqpConfig.port,
  amqp_opts: amqpConfig.amqp_opts,
  providers: {
    logger: logger,
  },
  // Important - onChannelConnect will ensure a certain configuration exists in RMQ.
  // This might not be needed in environments where RMQ is set up by some other process!
  onChannelConnect: async (channel) => {
    try {
      // Notice all of these are done in sequence with AWAIT. This is so that each
      // operation can depend on the prior operation having finished. This is important
      // when binding Queues to Exchanges, for example, because you need both the
      // Exchange and Queue to exist prior to trying to bind them together.

      // Make sure we have our example queue
      await channel.assertQueue(amqpConfig.exampleQueue, {
        autoDelete: true,
        durable: false,
      });
      // Make sure we have our example exchange
      await channel.assertExchange(amqpConfig.exampleExchange, 'direct', {
        autoDelete: true,
        durable: false,
      });
      // Bind the new Exchange and Queue together
      await channel.bindQueue(
        amqpConfig.exampleQueue,
        amqpConfig.exampleExchange,
        '' // Empty routing key to match anything published without one! (Messages published into this
        // exchange without a routing key WILL be sent to the bound queue.
      );
    } catch (ex) {
      logger.error(`onChannelConnect ERROR: ${util.inspect(ex.message)}`);
      // If we can't complete our connection setup, we better throw because it's unlikely we'll
      // be able to properly consume messages!
      throw ex;
    }
  },
});

// Next, set up some options for the AMQP Input Provider. Each option is explained in the comments above it.
const coreInputAmqpProviderOptions = {
  // When messages go NACK, do we want to ReQueue them? (For now, setting this to true will requeue the messages
  // into the same queue! We have a ROADMAP item to support more flexible re-queueing.
  // TODO: Once flexible re-queuing is implemented, reflect the feature here.
  // For this example, we'll go with no ReQueue so the messages are just dropped by the broker even on NACK.
  requeueOnNack: false,
  // When a new message is seen, this callback allows you to control how the rules engine context is set for that
  // message. This is not necessary in most cases. However, this can be used to calculate a custom value to add
  // to the context for some reason.
  inputContextCallback: (msg) => {
    // In this example, this callback receives the full AMQP-Cacoon message object (of type ConsumeMessage).
    // Our other application logic (the output provider in this case) is expecting
    // the orderFile to be set with a "name" that will be used to output a processed order to the file system.
    return {
      // Construct orderFile from the incoming message fields! For this, we'll just use
      // data coming from the AMQP Broker as an example, but it could be anything!
      orderFile: `${msg.fields.consumerTag}++${msg.fields.deliveryTag}`.replace(
        'amq.ctag-',
        ''
      ),
    };
  },
};

// Next we put all the pieces together into a new instance of CoreInputAmqp
const coreInputAmqpProvider = new CoreInputAmqp(
  amqpCacoon, // Our amqpCacoon object manages RMQ connections
  amqpConfig.exampleQueue, // This is the queue you're going to be consuming from
  logger, // This is the logger the libraries will use when logging anything.
  // Note it has to be a log4js logger!
  coreInputAmqpProviderOptions // And the other Options we setup above.
);

// And finally, we can set up, then start our rules engine with all the pieces.

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
    inputs: [coreInputAmqpProvider],
    outputs: [new RuleOutputProviderFile()],
    corpus: ruleCorpus,
    closures: ruleClosures,
    logger: logger,
  },
});

rulesHarvester.start();

logger.info(
  `RuleHarvester Example started. Send a order via a message into your broker's queue "${amqpConfig.exampleQueue}" then view the output in ./examples/output_order_dispatch`
);
