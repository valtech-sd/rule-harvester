/**
 * example-http-input
 *
 * This example demonstrates how to create a custom input that starts an HTTP server and receives
 * HTTP requests, then puts them through the rules engine. This example replies to the incoming
 * http request after the request is put through the rules engine (a rule pass). However, it is
 * possible to respond without waiting for the rules engine pass. See the embedded comments below
 * for more details.
 *
 * Once this example is running and listening, see the file 'example_digital_order_post.http'
 * for a request you can make.
 *
 */

// Package dependencies
const uuid = require('uuid');
const {
  default: RulesHarvester,
  CoreInputHttp,
  CoreInputHttpResponseType,
  ICoreHttpResponseAction,
} = require('rule-harvester');

// Example dependencies
const RuleOutputProviderFile = require('./providers/rule_output_file');
const ruleClosures = require('./providers/rule_closures');
// Notice for this example, we're using rule_corpus_http since the input and operation
// is different from the other examples. ALSO, this corpus is HTTP aware and has closures
// that are able to send HTTP responses which are useful for the HTTP input!
const ruleCorpus = require('./providers/rule_corpus_http');
const logger = require('./providers/custom_logger');

// Begin the setup of our options for the HTTP Input
const httpPorts = [3000];
const coreInputHttpProviderOptions = {
  // When a new http request is seen, this callback allows you to control how the rules engine context is set for that
  // request. This is not necessary in most cases. However, this can be used to calculate a custom value to add
  // to the context for some reason.
  inputContextCallback: (httpRequest) => {
    // In this example, this callback receives an http request object containing:
    //   method: string;
    //   body: object;
    //   query: object;
    //   params?: Array<string>;
    // Our other application logic (the output provider in this case) is expecting
    // the orderFile to be set with a "name" that will be used to output a processed order to the file system.
    return {
      // We don't do anything with the httpRequest here, but we could if necessary.

      // Construct orderFile from using a UUID
      // Just a random UUID so we have a unique "order file".
      orderFile: `${uuid.v4()}`,
    };
  },
  //
  // Next, set the responseMode for the HTTP Input. What is this? When we receive an HTTP
  // request, we can respond to it which is customary in HTTP APIs.
  // - CoreInputHttpResponseType.OutputAfterRulePass - The HTTP response will be done after a response
  //   from the rules engine is received. Allows for the rules engine to control the response.
  // - CoreInputHttpResponseType.OutputEmptyResponse - The HTTP response will be done right away with
  //   an empty body and http status code 200.
  // - CoreInputHttpResponseType.OutputStaticResponse - The HTTP response will be done right away, but
  //   will use the body, status code and other properties implemented in a valid <OutboundResponse>.
  //   The property staticHttpResponse must also be provided with a valid <OutboundResponse>.
  //
  // For this example, we will wait for the rules engine to respond, then we respond
  // to the Http request based on that!
  responseMode: CoreInputHttpResponseType.OutputAfterRulePass,
  // Note that if you instead choose 'CoreInputHttpResponseType.OutputStaticResponse'
  // then you must also set the staticHttpResponse object as follows: (this is not being
  // used in this example, but here for illustration purposes.)
  staticHttpResponse: new ICoreHttpResponseAction(
    { message: 'Order Received for batch processing.' },
    202
  ),
};

// Now, create our CoreInputHttp object, using the ports we set above,
// a log4js logger for logging and the coreInputHttpProviderOptions above.
const coreInputHttpProvider = new CoreInputHttp(
  httpPorts,
  logger,
  coreInputHttpProviderOptions
);

/**
 * This is an example of how to initialize and start the Rule Harvester.
 * Basically we pass it various providers.
 * Required providers include:
 * - ruleInputs: Input providers - In this example, a single input provider that starts an HTTP
 *   server and listens for requests on one or more ports. Note that the HTTP input provider CAN
 *   also respond to the HTTP request, either after a rules pass, or immediately (using static
 *   responses not dependent on the rules pass).
 * - ruleOutputs: Output providers - In this example, a single output provider. This is called after rules have been
 *   processed for a given input and just writes out an order file per valid order.
 * - ruleCorpus: This is the set of corpuses that is used to define what rules are applied to the input.
 * - ruleClosures: This is a list of function definitions available to the rules.
 */

let rulesHarvester = new RulesHarvester({
  providers: {
    inputs: [coreInputHttpProvider],
    outputs: [new RuleOutputProviderFile()],
    corpus: ruleCorpus,
    closures: ruleClosures,
    logger: logger,
  },
});

rulesHarvester.start();

logger.info(
  'RuleHarvester Example HTTP INPUT started. Send an HTTP POST to http://localhost:3000 with an order JSON in the BODY (you can copy the contents of one of the example orders and send that), then view the output in both your http client and ./examples/output_order_dispatch.'
);
