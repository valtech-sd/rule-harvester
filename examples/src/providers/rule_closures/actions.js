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
     * buildOrderDispatch
     * @param - facts
     * @param - context
     * @return - Build the dispatch
     **/
    name: 'buildOrderDispatch',
    handler(facts, context) {
      facts.orderDispatch = `Product: ${facts.product}
Product Type: ${facts.productType}
Shipping: ${facts.name}
          ${facts.shipping.street}
          ${facts.shipping.city}, ${facts.shipping.state} ${facts.shipping.zip}

Email: ${facts.email}

Base Price: ${facts.price}
Tax Percentage: ${facts.salesTaxPercentage || 0}
Tax Tax: ${facts.taxes}
Total Price: ${facts.total}
      `;
      return facts;
    },
  },
  {
    /**
     * buildOrderDispatch_InvalidOrder
     * @param - facts
     * @param - context
     * @return - Build the dispatch
     **/
    name: 'buildOrderDispatch_InvalidOrder',
    handler(facts, context) {
      facts.orderDispatch = `*** INVALID ORDER ***
Order Details:
${JSON.stringify(facts, null, 2)}
`;
      return facts;
    },
  },
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

  {
    /**
     * prepareAmqpRpcPublishAction
     *
     * Takes an order facts object and adds an <ICoreAmqpRpcPublishAction>amqpRpcPublishAction object
     * so that an AMQP RPC Output can send the order to a broker.
     *
     * Of course, this one is only useful IF the rules engine instance has an AMQP RPC Output as one
     * of its outputs.
     *
     * @param - facts
     * @param - context
     * @return - Build the dispatch
     **/
    name: 'prepareAmqpRpcPublishAction',
    handler(facts, context) {
      // The AMQP Rpc Output expects amqpRpcPublishAction, so we add that to facts
      // Note that this supports s SINGLE response!
      facts.amqpRpcPublishAction =
        {
          // REQUIRED: amqpMessageContent is set to whatever it is we want to publish to the broker
          amqpRpcResponse: facts.orderDispatch,
        }

      // Return the modified facts.
      return facts;
    },
  },

  {
    /**
     * prepareHttpResponseAction
     *
     * Takes an order facts object and adds an <ICoreHttpResponseAction>httpResponseAction object
     * so that an HTTP Input can send a response to the sending client application.
     *
     * @param - facts
     * @param - context
     * @return - Build the dispatch
     **/
    name: 'prepareHttpResponseAction',
    handler(facts, context) {
      // The HTTP Input expects httpResponseAction, so we add that to facts
      // Note that this is a SINGLE response since that's what HTTP allows.
      // There are several options supported:
      // - Leave facts.httpResponseAction set to null or undefined. The caller will receive an empty
      //   body and http status 200.
      // - Set facts.httpResponseAction to an object that conforms to <ICoreHttpResponseAction>.
      //   This allows control of the response BODY and HTTP STATUS downstream.
      // - Set facts.httpResponseAction to any object at all. The caller will receive the object
      //   passed here and an http status 200.
      facts.httpResponseAction = new ICoreHttpResponseAction(
        {
          // Pull orderFile from the context (which we set on INPUT)
          orderFile: context.orderFile,
          // Just output a success message to the client
          message: `Order Received for Processing.`,
        },
        202
      );
      // Return the modified facts.
      return facts;
    },
  },
];
