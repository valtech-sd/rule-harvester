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
    handler(facts) {
      facts.orderDispatch = `Product: ${facts.product}
Product Type: ${facts.type}
Shipping: ${facts.name}
          ${facts.shipping.street}
          ${facts.shipping.city}, ${facts.shipping.state} ${facts.shipping.zip}

Email: ${facts.email}

Base Price: ${facts.price}
Tax Percentage: ${facts.salesTaxPercetage || 0}
Tax Tax: ${facts.taxes}
Total Price: ${facts.total}
      `;
      return facts;
    },
  },
];
