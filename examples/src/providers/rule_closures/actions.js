const _ = require('lodash');

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
     * @param - facts
     * @param - context
     * @return - Build the dispatch
     **/
    name: 'prepareAmqpPublishAction',
    handler(facts, context) {
      // The AMQP Output expects amqpPublishAction, so we add that to facts
      facts.amqpPublishAction = {
        // amqpMessageContent is set to whatever it is we want to publish to the broker
        amqpMessageContent: facts.orderDispatch,
        // Routing key is used by PUBLISH and the Exchange to route the message to a queue
        // based on your RMQ Exchange/Queue configuration.
        // For this example, if the productType is digital, we'll set the routing key for the message to 'online-orders'
        // so that the exchange publish routes to the online-orders queue!
        amqpPublishRoutingKey:
          facts.productType === 'digital' ? 'online-orders' : '',
        // TODO: Add code that sets amqpPublishOptions to show, for example, setting headers or expiration.
      };
      return facts;
    },
  },
];
