/**
 * This is an example rule corpus that processes orders
 **/

module.exports = [
  // First validate the order
  {
    name: 'Validate the incoming order',
    rules: [
      {
        when: 'invalidOrderFile',
        then: [
          {
            closure: 'throw-message-validation-error',
            errorMessage: 'Invalid JSON!',
          },
        ],
      },
      {
        when: 'always',
        then: [
          { closure: 'reformat-amqp-message' },
          { closure: 'validateOrder' },
        ],
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
            // process digital item orders
            when: [
              {
                closure: 'equal',
                '^value1': 'productType',
                value2: 'digital',
              },
            ],
            then: [{ closure: 'setSalesTaxPercentageFixed', percentage: 0 }],
          },
          // Next Set the Sales Tax for Non-Digital Orders where we do have to check the state
          {
            // process non digital item orders
            when: [
              {
                closure: 'not-equal',
                '^value1': 'productType',
                value2: 'digital',
              },
            ],
            then: [
              // Set the Sales Tax according to the order's state
              {
                when: [
                  {
                    closure: 'checkShippingState',
                    '^orderShippingState': 'shipping.state',
                    state: 'FL',
                  },
                ],
                then: [
                  {
                    closure: 'setSalesTaxPercentage',
                    percentClosureName: 'getSalesTaxPercentageFl',
                  },
                ],
              },
              {
                when: [
                  {
                    closure: 'checkShippingState',
                    '^orderShippingState': 'shipping.state',
                    state: 'CA',
                  },
                ],
                then: [
                  {
                    closure: 'setSalesTaxPercentage',
                    percentClosureName: 'getSalesTaxPercentageCa',
                  },
                ],
              },
            ],
          },
          // Now that we have Sales Tax set based on the above criteria, we can process the order finally!
          {
            // 'Send the Order Bill'
            when: 'always',
            then: [
              { closure: 'calculateTaxes' },
              { closure: 'calculateTotalPrice' },
              { closure: 'buildOrderDispatch' },
              { closure: 'prepareAmqpPublishAction' },
              { closure: 'prepareAmqpRpcPublishAction' },
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
        then: [
          { closure: 'buildOrderDispatch_InvalidOrder' },
          { closure: 'prepareAmqpPublishAction' },
        ],
      },
    ],
  },
];
