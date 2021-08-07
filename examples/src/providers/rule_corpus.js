/**
 * This is an example rule corpus that processes orders
 **/
module.exports = [
  // First validate the order
  {
    name: 'Validate the incoming order',
    rules: [
      {
        when: 'always',
        then: [{ closure: 'validateOrder' }],
      },
    ],
  },
  // Now that we've validated, fire off some rules only for VALID ORDERS
  {
    name: 'process valid orders',
    rules: [
      {
        when: 'orderIsValid',
        then: [
          // Set the Sales Tax for Digital Orders first since those don't have per-state sales tax
          {
            name: 'process digital item orders',
            rules: [
              {
                when: [{ closure: 'checkProductType', type: 'digital' }],
                then: [{ closure: 'setSalesTaxPercentage', percentage: 0 }],
              },
            ],
          },
          // Next Set the Sales Tax for Non-Digital Orders where we do have to check the state
          {
            name: 'process non digital item orders',
            rules: [
              {
                when: [{ closure: 'checkNotProductType', type: 'digital' }],
                then: [
                  // Set the Sales Tax according to the order's state
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
          // Now that we have Sales Tax set based on the above criteria, we can process the order finally!
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
  // And fire off some rules only for INVALID ORDERS
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
