import { IInputProvider, ILogger } from '../../types';
import { ICoreAmqpMessage } from '../types/amqp-types';
import AmqpCacoon, {
  ConsumeMessage,
  Channel,
  ChannelWrapper,
} from 'amqp-cacoon';
import _ from 'lodash';
import { default as util } from 'util';

export interface ICoreInputAmqpProviderOptions {
	// ackMod - Default = auto
	// auto
	//   acks on rules engine success
	//   ack on error with name=MessageValidationError 
	// callback
	//   Calls ackCallback to handle success and and error nack/acks
	//   The callback is responsible for acking or nacking all calls
	//   NOTE: The facts in the callback will return null if an error occured
	ackMode?: 'auto' | 'callback';
  requeueOnNack?: boolean; // Only used for ackMode = 'auto'
	ackCallback?: (
		rulesEngineOutput: {facts: any, error: unknown},
		msg: ICoreAmqpMessage | undefined,
		channel: {
			ack: (options: {requeue: boolean, allUpTo: boolean}) => void, 
			nack: (options: {requeue: boolean, allUpTo: boolean}) => void
		}
	) => Promise<void>;
  inputContextCallback?: (msg: ConsumeMessage) => void;
}

/**
 * Rule Input Provider Amqp
 *
 * This class wires up the AmqpCacoon to a rule input provider.
 *
 * Usage:
 * 1. Instantiate the class and pass in the instantiated amqpCacoon and logger
 * 2. call registerHandler to register the input callback
 * 3. When input comes in, the handler registered in step 2 will be called
 *
 **/
export default class CoreInputAmqp implements IInputProvider {
  private handler!: (input: any, context: any) => Promise<any>;
  private alreadyRegistered: boolean;
  private logger?: ILogger;
  private amqpCacoon: AmqpCacoon;
  private amqpQueue: string;
  private options: ICoreInputAmqpProviderOptions;

  /**
   * constructor
   *
   * This function sets class level variables.
   *
   * @param amqpCacoon - an instance of AMQP Cacoon which will manage all AMQP communications.
   * @param amqpQueue - a string with the name of the queue to consume from.
   * @param logger - a logger instance to use for logging.
   * @param options - options for the behavior of the provider.
   **/
  constructor(
    amqpCacoon: AmqpCacoon,
    amqpQueue: string,
    logger: ILogger | undefined,
    options: ICoreInputAmqpProviderOptions
  ) {
    this.alreadyRegistered = false;
    // Save the constructor parameters to local class variables
    this.logger = logger;
    this.amqpCacoon = amqpCacoon;
    this.amqpQueue = amqpQueue;
    this.options = options || {};
		if (!this.options.ackCallback) {
			this.options.ackMode = 'auto'
		}
  }

  /**
   * registerHandler
   *
   * Does this by...
   * 1. Points the passed in applyInputCb to a class instance handler
   * 2. If this is the first call then we register an amqpCacoon consumer which in turn
   *    registers an amqpHandler function that will receive all new AMQP messages.
   *
   * @param applyInputCb - a handler that will be called when there is input. It should be passed input and context.
   * @returns Promise<void>
   **/
  async registerInput(
    applyInputCb: (input: any, context: any) => Promise<any>
  ) {
    this.logger?.trace(`CoreInputAmqp.registerHandler: Start`);

    // Link applyInputCb to a class property we can reference later
    this.handler = applyInputCb;

    if (!this.alreadyRegistered) {
      // Register the local handler with the amqp provider
      await this.amqpCacoon.registerConsumer(
        this.amqpQueue,
        this.amqpHandler.bind(this)
      );
      // Make so we only register one consumer
      this.alreadyRegistered = true;
    }
    this.logger?.trace(`CoreInputAmqp.registerHandler: End`);
  }

  /**
   * amqpHandler
   *
   * This is the function that we register with the amqpCacoon.
   * This function loops through the handlers registered and passes
   * the amqp message to our local registered handlers as a message.
   *
   * Note tha this INPUT provider adds a SPECIFIC object into facts with property amqpMessage.
   * amqpMessage in turn has three objects:
   * - amqpMessageContent: a string containing the AMQP message content.
   * - amqpMessageFields: an object, the amqp fields object.
   * - amqpMessageProperties: an object, the amqp properties object.
   *
   * @param channel: the active/open AMQP channel (inside a ChannelWrapper from node-amqp-connection-manager) to consume from.
   * @param msg: object - the message object, ConsumeMessage type.
   * @return Promise<void>
   **/
  async amqpHandler(channel: ChannelWrapper, msg: ConsumeMessage) {
    this.logger?.trace(`CoreInputAmqp.amqpHandler: Start`);
		let output = {facts: undefined, error: undefined}
    let amqpMessage: ICoreAmqpMessage | undefined= undefined;
    try {
      // Create an object for our message - note we DO NOT validate the message here at all!
      // It will be set to a string with whatever. it's the responsibility of the application
      // using this Input to validate and THROW an error with the name 'MessageValidationError'
      // which this method will catch and treat differently!
      amqpMessage = {
        amqpMessageContent: msg.content.toString(),
        amqpMessageFields: msg.fields,
        amqpMessageProperties: msg.properties,
      };

      // And an object for our context
      let context: any = {};

      // Call the inputContextCallback if we were passed one
      if (this.options.inputContextCallback) {
        context = _.merge(context, this.options.inputContextCallback(msg));
      }

      this.logger?.debug(
        `CoreInputAmqp.amqpHandler - amqpMessage: ${util.inspect(amqpMessage)}`
      );

      // Call our handler with an object for facts called amqpMessage that wraps our
      // ICoreAmqpMessage. Why? This input can't "own" the facts structure of the rules engine
      // since that should be driven by an application. Therefore, we just put in 1 item into
      // facts, an amqpMessage and then let the application do whatever it wants/needs.
      // Note, the handler WILL return updated facts, but we're not using them in this input!
      output.facts = await this.handler(
        { amqpMessage: amqpMessage },
        context
      );

      // Ack the message
			if (this.options.ackMode === 'auto') {
				channel.ack(msg);
			}
    } catch (e) {
			output.error = e;
      // Handle errors!

      // If this is a message validation error then we do not need to retry because this is not going to magically be fixed.
      // Note: Applications using this Input are expected to return an error name == 'MessageValidationError'
      // to trigger this first condition! These messages, since they are invalid, are ACK so that they don't
      // requeue forever! (They're expected to fail any retry, since they're invalid!)
      if (e.name === 'MessageValidationError') {
        this.logger?.error(
          `CoreInputAmqp.amqpHandler: Validation Error: ${e.message}`
        );
        this.logger?.trace(`The message contained: ${msg.content.toString()}`);
        this.logger?.trace(
          `The message fields contained: ${util.inspect(msg.fields)}`
        );
        this.logger?.trace(
          `The message properties contained: ${util.inspect(msg.properties)}`
        );
        // Since we're dealing with INVALID messages (as defined by the application using this Input) we
        // ACK so we don't requeue the messages forever!
				if (this.options.ackMode === 'auto') {
					channel.ack(msg);
				}
      } else {
        // Otherwise, the error is something other than INVALID MESSAGE, so we deal with it.
        this.logger?.error(
          `CoreInputAmqp.amqpHandler - Will Nack Message - INNER ERROR: ${e.message}`
        );
        // Nack the message and requeue only based on the options passed to this input
				if (this.options.ackMode === 'auto') {
					channel.nack(msg, false, this.options.requeueOnNack || false);
				}
      }
    }
		if (this.options.ackMode === 'callback') {
			if (this.options.ackCallback) {
				await this.options.ackCallback(output, amqpMessage, {
					ack: ({allUpTo}) => channel.ack(msg, allUpTo),
					nack: ({requeue, allUpTo}) => channel.nack(msg, allUpTo, requeue)
				});
			} else {
				this.logger?.error('CoreInputAmqp.amqpHandler - Error: options.ackCallback is not defined but we are in callback mode and this needs to be defined');
			}
		}
    this.logger?.trace(`CoreInputAmqp.amqpHandler: End`);
  }
}
