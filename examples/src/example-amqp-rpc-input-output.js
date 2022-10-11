/**
 * example-amqp-rpc-input-output
 *
 * This example demonstrates how to use the AMQP Core Input in order to start a rules engine that
 * subscribes to a RabbitMQ AMQP Host and consumes messages published to a specific queue. It then
 * takes those messages and puts them through the rules engine and eventually responds via AMQP RPC
 * based on the facts object including an amqpRpcResponseAction.
 *
 * Learn more about the AMQP RPC pattern here: https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html
 *
 * DEPENDENCIES:
 * The AMQP Core Input and AMQP RPC Core Output providers use 2 other packages, both of which should be
 * installed into your project when you install rule-harvester. These are:
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
const {
  default: RulesHarvester,
  CoreInputAmqp,
  CoreOutputAmqpRpc,
} = require('rule-harvester');
const AmqpCacoon = require('amqp-cacoon').default;

// Bring in other Application Specific dependencies
const ruleClosures = require('./providers/rule_closures');
const ruleClosuresAmqp = require('./providers/rule_closures/actions-amqp');
const ruleCorpus = require('./providers/rule_corpus.js');
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
  onBrokerConnect: async (connection, url) => {
    // This is an example "Connect" event fired off by AMQP Connection Manager
    logger.debug(
      `Connected to broker: "${amqpConfig.host}" on port ${amqpConfig.port} over "${amqpConfig.protocol}".`
    );
  },
  onBrokerDisconnect: async (err) => {
    // This is an example "Disconnect" event fired off by AMQP Connection Manager
    logger.error(`Broker disconnected with error "${err.err.message}"`);
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
      // Make sure we have our example rpc response queue
      await channel.assertQueue(amqpConfig.exampleQueueRpcResponse, {
        autoDelete: true,
        durable: false,
      });
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

// Next we put all the pieces together into a new instance of CoreOutputAmqpRpc
const coreOutputAmqpRpcProvider = new CoreOutputAmqpRpc(
  amqpCacoon, // Our amqpCacoon object manages RMQ connections
  logger // This is the logger the libraries will use when logging anything.
  // Note it has to be a log4js logger!
);

// And finally, we can set up, then start our rules engine with all the pieces.

/**
 * This is an example of how to initialize and start the Rule Harvester with an AMQP Input and an AMQP RPC Output.
 *
 * Required providers include:
 * - ruleInputs: Input providers - In this example, a single input provider that listens to an AMQP queue and consumes
 *   messages as they are received.
 * - ruleOutputs: Output providers - In this example, a single AMQP RPC Output. This is called after rules have been
 *   processed for a given input and writes out an order response message per valid order input.
 * - ruleCorpus: This is the set of corpuses that is used to define what rules are applied to the input.
 * - ruleClosures: This is a list of function definitions available to the rules.
 */
let rulesHarvester = new RulesHarvester({
  providers: {
    inputs: [coreInputAmqpProvider],
    outputs: [coreOutputAmqpRpcProvider],
    corpus: ruleCorpus,
    closures: [...ruleClosures, ...ruleClosuresAmqp],
    logger: logger,
  },
});

rulesHarvester.start();

/**
 * Testing this example is the same as testing the Core AMQP Input example, except that in order to receive
 * an RPC response, when you send a message into the test input queue, be sure to set the following properties
 * for the message:
 * - reply_to - should be set to the name of the queue to receive the response into.
 * - correlation_id - should be a unique ID that the client application can use to match a response with a request
 * (especially if it has sent more than one request.)
 */

logger.info(
  `RuleHarvester Example AMQP RPC INPUT OUTPUT started.\nSend a order via a message into your broker's queue "${amqpConfig.exampleQueue}" with the property "reply_to" set to "${amqpConfig.exampleQueueRpcResponse}" and any value for the property "correlation_id".\nIf you include "reply_to" and "correlation_id", then you'll receive a response in "${amqpConfig.exampleQueueRpcResponse}".`
);
logger.info(
  `An easy way to send messages is to open one of the example order files, then paste the contents into the RabbitMQ console. Under QUEUES, click into "${amqpConfig.exampleQueue}" and notice there is a publish message section. Paste the contents of one of the order files in there, set the two properties "reply_to" and "correlation_id" and click PUBLISH MESSAGE.`
);
