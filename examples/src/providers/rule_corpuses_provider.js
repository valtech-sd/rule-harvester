/**
 * This is an example rule corpus that doesn't do anything useful
 **/
module.exports = [
  {
    name: 'process-digital-item-orders',
    rules: [
      {
        when: [{ closure: 'checkProductType', type: 'digital' }],
        then: [{ closure: 'setSalesTaxPercetage', percentage: 0 }],
      },
    ],
  },
  {
    name: 'process-other-normal-orders',
    rules: [
      {
        when: [
          { closure: 'checkNotProductType', type: 'digital' },
          { closure: 'checkShippingState', state: 'FL' },
        ],
        then: [{ closure: 'setSalesTaxPercetage', percentage: 6 }],
      },
      {
        when: [
          { closure: 'checkNotProductType', type: 'digital' },
          { closure: 'checkShippingState', state: 'CA' },
        ],
        then: [{ closure: 'setSalesTaxPercetage', percentage: 7.5 }],
      },
    ],
  },
  {
    name: 'send-order-bill',
    rules: [
      {
        when: 'always',
        then: [
          { closure: 'calculateTaxes' },
          { closure: 'calculateTotalPrice' },
          { closure: 'buildOrderDispatch' },
        ],
      },
    ],
  },
];
