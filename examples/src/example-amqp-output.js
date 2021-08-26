/**
 * example-amqp-output
 *
 * This example demonstrates how to use the AMQP Core Output in order to start a rules engine that
 * publishes to a RabbitMQ AMQP Host after the rules engine has had a pass at the input data.
 *
 * DEPENDENCIES:
 * The AMQP Core Input uses 2 other packages both of which should be installed into your project
 * when you install rule-harvester. These are:
 *
 * - AMQP Cacoon - is a package that manages connections to RabbitMQ.
 * - log4js - is a generic logger for NodeJS. See the file ./providers/custom_logger.js for a very
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
const { default: RulesHarvester, CoreOutputAmqp } = require('rule-harvester');
const AmqpCacoon = require('amqp-cacoon').default;

// Bring in other Application Specific dependencies
const RuleInputProviderDirectoryWatcher = require('./providers/rule_input_directory_watcher');
const ruleClosures = require('./providers/rule_closures');
const ruleCorpus = require('./providers/rule_corpus');
const logger = require('./providers/custom_logger');

// Bring in our AMQP Broker configuration
const amqpConfig = require('./conf/amqp-config');

// Since the AMQP Output requires an AMQP Cacoon object, let's start by creating that.
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
  // This might not be needed in environments where RMQ is setup by some other process!
  onChannelConnect: async (channel) => {
    try {
      // Notice all of these are done in sequence with AWAIT. This is so that each
      // operation can depend on the prior operation having finished. This is important
      // when binding Queues to Exchanges, for example because you need both the
      // Exchange and Queue to exist prior to trying to bind them together.

      // Make sure we have our example queue
      await channel.assertQueue(amqpConfig.exampleQueueOutput, {
        autoDelete: true,
        durable: false,
      });
      // Make sure we have another example queue for messages with routing keys
      await channel.assertQueue(
        `${amqpConfig.exampleQueueOutput}-online-orders`,
        {
          autoDelete: true,
          durable: false,
        }
      );
      // Make sure we have our example exchange
      await channel.assertExchange(amqpConfig.exampleExchangeOutput, 'direct', {
        autoDelete: true,
        durable: false,
      });
      // Bind the new Exchange and Queue together
      await channel.bindQueue(
        amqpConfig.exampleQueueOutput,
        amqpConfig.exampleExchangeOutput,
        '' // Empty routing key to match anything published without one! (Messages published into this
        // exchange without a routing key WILL be sent to the bound queue.
      );
      // Bind the new Exchange and Queue together, but for the second queue with routing key
      await channel.bindQueue(
        `${amqpConfig.exampleQueueOutput}-online-orders`,
        amqpConfig.exampleExchangeOutput,
        'online-orders' // Empty routing key to match anything published without one! (Messages published into this
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

// Next we put all the pieces together into a new instance of CoreInputAmqp
const coreOutputAmqpProvider = new CoreOutputAmqp(
  amqpCacoon, // Our amqpCacoon object manages RMQ connections
  logger // This is the logger the libraries will use when logging anything.
  // Note it has to be a log4js logger!
);

// And finally, we can set up, then start our rules engine with all the pieces.

/**
 * This is an example of how to initialize and start the Rule Harvester with an AMQP Output.
 *
 * Required providers include:
 * - ruleInputs: Input providers - In this example, a single input provider that Calls a registered function when new
 *   files are observed in a directory.
 * - ruleOutputs: Output providers - In this example, a single output provider to AMQP. Facts received in the output
 *   are expected to have an amqpPublishAction object. If they do, the message in that object will publish
 *   to the Exchange that the provider is connected to.
 * - ruleCorpus: This is the set of corpuses that is used to define what rules are applied to the input.
 * - ruleClosures: This is a list of function definitions available to the rules.
 *
 * What is amqpPublishAction? It's an object that should conform to the type <ICoreAmqpPublishAction> containing
 * the following properties:
 * - amqpMessageContent: the message to publish as a <string>.
 * - amqpPublishRoutingKey: the routing key for the message, as a string or null, empty or undefined for no routing key.
 *
 * See the file /src/core/outputs/amqp-output.ts for more comments.
 *
 */
let rulesHarvester = new RulesHarvester({
  providers: {
    inputs: [new RuleInputProviderDirectoryWatcher()],
    outputs: [coreOutputAmqpProvider],
    corpus: ruleCorpus,
    closures: ruleClosures,
    logger: logger,
  },
});

rulesHarvester.start();

logger.info(
  `RuleHarvester Example AMQP OUTPUT started. Copy an example order file into ./examples/input_watch_path then view the output in your broker's queues starting with '${amqpConfig.exampleQueueOutput}'.`
);
logger.info(
  `An easy way to see messages is to open the RabbitMQ console. Under QUEUES, click into "${amqpConfig.exampleQueue}" and notice there is a GET MESSAGES section. Click that to pull out any messages in the queue.`
);
