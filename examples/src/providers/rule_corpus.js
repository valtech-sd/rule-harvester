/**
 * This is an example rule corpus that processes orders
 **/
module.exports = [
  // First mark the order as invalid since we've not yet
  {
    name: 'Mark the order as valid or invalid based on the closure',
    rules: [
      {
        when: 'always',
        then: [{ closure: 'validateOrder' }],
      },
    ],
  },
  {
    name: 'process valid orders',
    rules: [
      {
        when: 'orderIsValid',
        then: [
          {
            name: 'process digital item orders',
            rules: [
              {
                when: [{ closure: 'checkProductType', type: 'digital' }],
                then: [{ closure: 'setSalesTaxPercentage', percentage: 0 }],
              },
            ],
          },
          {
            name: 'process non digital item orders',
            rules: [
              {
                when: [{ closure: 'checkNotProductType', type: 'digital' }],
                then: [
                  {
                    name: 'process by state',
                    rules: [
                      {
                        when: [{ closure: 'checkShippingState', state: 'FL' }],
                        then: [
                          { closure: 'setSalesTaxPercentage', percentage: 6 },
                        ],
                      },
                      {
                        when: [{ closure: 'checkShippingState', state: 'CA' }],
                        then: [
                          { closure: 'setSalesTaxPercentage', percentage: 7.5 },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'Send the Order Bill',
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
        ],
      },
    ],
  },
  {
    name: 'Process invalid Orders',
    rules: [
      {
        when: 'orderIsNotValid',
        then: [{ closure: 'buildOrderDispatch_InvalidOrder' }],
      },
    ],
  },
];
