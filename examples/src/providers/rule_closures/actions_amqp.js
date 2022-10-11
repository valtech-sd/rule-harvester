// Package Dependencies
const _ = require('lodash');
const { ICoreHttpResponseAction } = require('rule-harvester');

// Application Dependencies
// Bring in our AMQP Broker configuration
const amqpConfig = require('./../../conf/amqp-config');

// These are just example closures to transform the data
module.exports = [
  {
    /**
     * prepareAmqpPublishAction
     *
     * Takes an order facts object and adds an <ICoreAmqpPublishAction>amqpPublishAction object
     * so that an AMQP Output can send the order to a broker.
     *
     * Of course, this one is only useful IF the rules engine instance has an AMQP Output as one
     * of its outputs.
     *
     * @param - facts
     * @param - context
     * @return - Build the dispatch
     **/
    name: 'prepareAmqpPublishAction',
    handler(facts, context) {
      // The AMQP Output expects amqpPublishAction, so we add that to facts
      // Note that this supports an ARRAY to send multiple messages!
      facts.amqpPublishAction = [
        {
          // REQUIRED: amqpPublishExchange is the exchange to send the message to
          amqpPublishExchange: amqpConfig.exampleExchangeOutput,
          // REQUIRED: amqpMessageContent is set to whatever it is we want to publish to the broker
          amqpMessageContent: facts.orderDispatch,
          // OPTIONAL: Routing key is used by PUBLISH and the Exchange to route the message to a queue
          // based on your RMQ Exchange/Queue configuration.
          // For this example, if the productType is digital, we'll set the routing key for the message to 'online-orders'
          // so that the exchange publish routes to the online-orders queue!
          amqpPublishRoutingKey:
            facts.productType === 'digital' ? 'online-orders' : '',
          // OPTIONAL: amqpPublishOptions is an object conforming to AMQPLIB's PUBLISH OPTIONS.
          // See: https://www.squaremobius.net/amqp.node/channel_api.html#channel_publish
          amqpPublishOptions: {},
        },
        // Could send other messages here also by including more entries of <ICoreAmqpPublishAction>
        // {
        //   amqpPublishExchange: '',
        //   amqpMessageContent: '',
        //   amqpPublishRoutingKey: '',
        //   amqpPublishOptions: {}
        // }
      ];

      // Return the modified facts.
      return facts;
    },
  },
];
