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
Product Type: ${facts.type}
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
${JSON.stringify(facts, null,2)}
`;
      return facts;
    },
  },
];
