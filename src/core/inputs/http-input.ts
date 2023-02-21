// Bring in package dependencies
import _ from 'lodash';
import CoronadoBridge, {
  IBridgeConfig,
  IOutboundProvider,
  OutboundResponse,
} from 'coronado-bridge';

// Bring in rule-harvester dependencies
import { IInputProvider, ILogger } from '../../types';
import { ICoreHttpRequest } from '../types/http-types';

/**
 * CoreInputHttpResponseType os an enum for use in the responseMode property of
 * <ICoreInputHttpProviderOptions>. It determines how the Core HTTP Input responds
 * to an HTTP Request.
 *
 * The options are:
 * - OutputAfterRulePass - The HTTP response will be done after a response from the rules engine
 *   is received. Allows for the rules engine to control the response.
 * - OutputEmptyResponse - The HTTP response will be done right away with an empty body and
 *   http status code 200.
 * - OutputStaticResponse - The HTTP response will be done right away, but will use the body,
 *   status code and other properties implemented in a valid <OutboundResponse>. The property
 *   staticHttpResponse must also be provided with a valid <OutboundResponse>.
 */
export enum CoreInputHttpResponseType {
  OutputAfterRulePass,
  OutputEmptyResponse,
  OutputStaticResponse,
}

// Export an interface to hold our provider options
export interface ICoreInputHttpProviderOptions {
  responseMode: CoreInputHttpResponseType;
  staticHttpResponse?: OutboundResponse;
  inputContextCallback?: (req: ICoreHttpRequest) => void;
}

export default class CoreInputHttp implements IInputProvider {
  private alreadyRegistered: boolean;
  private logger?: ILogger;
  private httpPorts: Array<number>;
  private httpBridge!: CoronadoBridge;
  private httpHandler!: any;
  private options: ICoreInputHttpProviderOptions;

  /**
   * constructor
   *
   * This function sets class level variables.
   *
   * @param httpPorts - an array of numbers, the ports to start HTTP servers on.
   * @param logger - a logger instance to use for logging. 
   * @param options
   **/
  constructor(
    httpPorts: Array<number>,
    logger: ILogger | undefined,
    options: ICoreInputHttpProviderOptions
  ) {
    this.alreadyRegistered = false;
    // Save the constructor parameters to local class variables
    this.logger = logger;
    this.httpPorts = httpPorts;
    this.options = options;
  }

  /**
   * registerHandler
   *
   * Does this by...
   * 1. Starts an instance of the Http Bridge (Coronado Bridge) which starts an Express server
   *    on the ports declared in the private instance properties of the class (passed in the class
   *    constructor).
   * 1. The Http Bridge receives the passed applyInputCb so that new Http Requests can be
   *    inputs into the rules engine.
   * 2. If this is the first call then we register the HttpHandler function with the amqp provider
   * *  If not the first call then we do nothing else
   *
   * @param applyInputCb - a handler that will be called when there is input. It should be passed input and context.
   * @returns Promise<void>
   **/
  async registerInput(
    applyInputCb: (input: any, context: any) => Promise<any>
  ) {
    this.logger?.trace(`CoreInputHttp.registerHandler: Start`);

    // Setup a handler for the Http request
    this.httpHandler = new HttpHandler(applyInputCb, this.logger, this.options);

    // Wire in http bridge to this handler, if we've not done so already!
    if (!this.alreadyRegistered) {
      // Configure then Start up a new instance of the Http Bridge (note, this wires in the handler!)
      const bridgeConfig: IBridgeConfig = {
        ports: this.httpPorts,
        logger: this.logger,
        outboundProvider: this.httpHandler,
      };
      this.httpBridge = new CoronadoBridge(bridgeConfig);
      // Keep track so that we only register one http bridge
      this.alreadyRegistered = true;
    }
    this.logger?.trace(`CoreInputHttp.registerHandler: End`);
  }

  async unregisterInput() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.httpBridge.close();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
}

/**
 * This is the class that receives the HTTP request then passes it into
 * the Rules Engine. This must conform to Coronado Bridge's IOutboundProvider.
 * It is "outbound" from Coronado Bridge into Rules Engine!
 *
 * This is also where we are able to send an HTTP response to the request
 * since the rules engine provides us a promise that resolves with the updated FACTS.
 *
 * See the comments in the handler method for how to control the response sent
 * to HTTP!
 */
class HttpHandler implements IOutboundProvider {
  private applyInputCb;
  private logger?: ILogger;
  private options: ICoreInputHttpProviderOptions;

  // Construct our instance, holding the reference to the Rule-Harvester Apply Input Callback
  constructor(
    applyInputCb: (input: any, context: any) => Promise<any>,
    logger: ILogger | undefined,
    options: ICoreInputHttpProviderOptions
  ) {
    this.applyInputCb = applyInputCb;
    this.logger = logger;
    this.options = options;
  }

  /**
   * handler
   *
   * This is a CoronadoBridge IOutboundProvider that gets called when any new
   * http requests come into an active Coronado Bridge.
   *
   * @param req - holds the ICoreHttpRequest (which implements Coronado Bridge's IProviderReq)
   * that's incoming (which is NOT an express http request but holds similar properties (a subset
   * of a request.)
   *
   * ICoreHttpRequest | IProviderReq contains:
   * - method: (string) - GET, PUT, DELETE, etc.
   * - body: (object) - The received BODY as an object.
   * - query: (object) - An object that has all the query string items.
   * - params?: (optional Array<string>) - This is the PATH of the request.
   *
   * Note that to respond to the HTTP Request, once the rules engine pass is complete,
   * this method expects a property "httpResponseAction" as the part of the resulting
   * facts.
   *
   * There are several options supported for the structure of httpResponseAction:
   * - Leave facts.httpResponseAction set to null or undefined. The caller will receive an empty
   *   body and http status 200.
   * - Set facts.httpResponseAction to an object that conforms to <ICoreHttpResponseAction>.
   *   This allows control of the response BODY and HTTP STATUS downstream.
   * - Set facts.httpResponseAction to any object at all. The caller will receive the object
   *   passed here and an http status 200.
   *
   *   <ICoreHttpResponseAction> implements Coronado Bridge's <OutboundResponse> and includes:
   *   - body: object - an object to return as the HTTP body of the response.
   *   - status: number - an HTTP status code for th response.
   *
   *   Since this interface comes as an implementation of Coronado Bridge's <OutboundResponse>,
   *   please check the Coronado project for the latest implementation of this interface!
   */
  async handler(req: ICoreHttpRequest) {
    // Trace out the request
    this.logger?.trace(req);

    // And an object for our context
    let context: any = {};

    // Call the inputContextCallback if we were passed one (this is an app-specific
    // way to add context to the received request.)
    if (this.options.inputContextCallback) {
      context = _.merge(context, this.options.inputContextCallback(req));
    }

    try {
      switch (this.options.responseMode) {
        case CoreInputHttpResponseType.OutputAfterRulePass:
          // Note we await (wait for Rules Engine) to respond.
          return await this.callRulesAndWait(req, context);
          break;
        case CoreInputHttpResponseType.OutputEmptyResponse:
          // We do not wait, we just respond
          this.callRulesWithoutWaitingForResponse(req, context);
          return new OutboundResponse({}, 200);
          break;
        case CoreInputHttpResponseType.OutputStaticResponse:
          // We do not wait, we just respond
          this.callRulesWithoutWaitingForResponse(req, context);
          // If we have a staticHttpResponse, we use that
          if (this.options.staticHttpResponse) {
            return this.options.staticHttpResponse;
          } else {
            // Otherwise, just respond with empty response
            return new OutboundResponse({}, 200);
          }
          break;
      }
    } catch (ex) {
      // Something threw. We pass it forward. If it's a BridgeError the bridge will
      // pass properly formatted to the http client! Otherwise, the bridge will return an http 500 with
      // ex.message.
      this.logger?.trace(
        `CoreInputHttp HttpHandler - Received error - ${ex.message}`
      );
      throw ex;
    }
  }

  /**
   * Pass the incoming HTTP Request into the Rules Engine and wait for a response.
   * Note we call our Rules Engine callback with an object for facts called httpRequest that
   * wraps our http request. Why? This input can't "own" the facts structure of the rules engine
   * since that should be driven by an application. Therefore, we just put in 1 item into
   * facts, an HTTP Request and then let the application do whatever it wants/needs.
   * @param req - the request.
   * @param context - the context for the request.
   */
  private async callRulesAndWait(req: ICoreHttpRequest, context: any) {
    // This method's call to the rules engine callback needs to be wrapped in try/catch because the rules
    // engine might throw!
    const result = await this.applyInputCb({ httpRequest: req }, context);
    // Log the result
    this.logger?.trace(result);
    // Result (which is the entire altered facts object after a rules pass) can also contain
    // a property httpResponseAction in order to respond with something custom. If we find it
    // we respond wih that! If it's empty or just undefined, the http bridge will just respond
    // with http 200 and an empty body!  The http bridge will also always respond with 200 if
    // this is not an instanceof OutboundResponse.
    return new OutboundResponse(result.httpResponseAction.body, result.httpResponseAction.status, result.httpResponseAction.headers);
  }

  /**
   * Pass the incoming HTTP Request into the Rules Engine and DO NOT wait for a response.
   * Note we call our Rules Engine callback with an object for facts called httpRequest that
   * wraps our http request. Why? This input can't "own" the facts structure of the rules engine
   * since that should be driven by an application. Therefore, we just put in 1 item into
   * facts, an HTTP Request and then let the application do whatever it wants/needs.
   * @param req - the request.
   * @param context - the context for the request.
   */
  private callRulesWithoutWaitingForResponse(
    req: ICoreHttpRequest,
    context: any
  ) {
    // Since we're not "waiting" here for the Rules Engine pass, we catch any errors and log
    // This solves an issue where a promise error would go unhandled.
    this.applyInputCb({ httpRequest: req }, context).catch(err => this.logger?.trace(
      `CoreInputHttp HttpHandler, callRulesWithoutWaitingForResponse - Received error from applyInputCb - ${err.message}`
    ));
  }
}
