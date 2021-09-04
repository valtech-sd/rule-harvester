/**
 * This is an example rule corpus that processes orders received from an HTTP Input.
 **/

module.exports = [
  // First validate the order
  {
    name: 'Validate the incoming order',
    rules: [
      {
        // Note that we can throw an HTTP error back to the HTTP client easily from within the Corpus.
        when: 'invalidOrderHttpPost',
        then: [
          {
            closure: 'throw-http-error',
            errorMessage: 'The request must be a POST with a request body.',
            errorName: 'Bad Request',
            httpStatusCode: 400,
          },
        ],
      },
      {
        when: 'always',
        then: [
          { closure: 'reformat-http-request' },
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
            name: 'process digital item orders',
            rules: [
              {
                when: [
                  {
                    closure: 'equal',
                    '^value1': 'productType',
                    value2: 'digital',
                  },
                ],
                then: [
                  { closure: 'setSalesTaxPercentageFixed', percentage: 0 },
                ],
              },
            ],
          },
          // Next Set the Sales Tax for Non-Digital Orders where we do have to check the state
          {
            name: 'process non digital item orders',
            rules: [
              {
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
                    name: 'process by state',
                    rules: [
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
                  // This coming closure is where we decide how we respond to the HTTP request (if at all)
                  { closure: 'prepareHttpResponseAction' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  // And fire off some rules only for INVALID ORDERS
  // Notice in this case, we respond to the HTTP Input with an HTTP response, status 400 to indicate a bad request.
  {
    name: 'Process invalid Orders',
    rules: [
      {
        when: 'orderIsNotValid',
        then: [
          {
            closure: 'throw-http-error',
            errorMessage:
              'The request did not contain a valid order. Please check the passed body and make adjustments!',
            errorName: 'Bad Request',
            httpStatusCode: 400,
          },
        ],
      },
    ],
  },
];
