import { IInputProvider } from '../../types';
import { ICoreAmqpMessage } from '../types/amqp-types';
import AmqpCacoon, {ConsumeMessage, Channel, ChannelWrapper} from 'amqp-cacoon';
import { Logger } from 'log4js';
import _ from 'lodash';
import { default as util } from 'util';

export interface ICoreInputAmqpProviderOptions {
  requeueOnNack?: boolean,
  inputContextCallback?: (msg: ConsumeMessage) => void,
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
  private logger: Logger;
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
   * @param logger - a log4js logger instance to use for logging.
   * @param options - options for the behavior of the provider.
   **/
  constructor(amqpCacoon: AmqpCacoon, amqpQueue: string, logger: Logger, options: ICoreInputAmqpProviderOptions) {
    this.alreadyRegistered = false;
    // Save the constructor parameters to local class variables
    this.logger = logger;
    this.amqpCacoon = amqpCacoon;
    this.amqpQueue = amqpQueue;
    this.options = options;
  }

  /**
   * registerHandler
   *
   * Does this by...
   * 1. Points the passed in applyInputCb to a class instance handler
   * 2. If this is the first call then we register the amqpHandler function with the amqp provider
   * *  If not the first call then we do nothing else
   *
   * @param applyInputCb - a handler that will be called when there is input. It should be passed input and context.
   * @returns Promise<void>
   **/
  async registerInput(applyInputCb: (input: any, context: any) => Promise<any>) {
    this.logger.trace(`RuleInputProviderAmqp.registerHandler: Start`);

    // Link applyInputCb to a class property we can reference later
    this.handler = applyInputCb;

    if (!this.alreadyRegistered) {
      // Register the local handler with the amqp provider
      await this.amqpCacoon.registerConsumer(this.amqpQueue, this.amqpHandler.bind(this));
      // Make so we only register one consumer
      this.alreadyRegistered = true;
    }
    this.logger.trace(`RuleInputProviderAmqp.registerHandler: End`);
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
    this.logger.trace(`RuleInputProviderAmqp.amqpHandler: Start`);
    try {
      // Create an object for our message - note we DO NOT validate the message here at all!
      // It will be set to a string with whatever. it's the responsibility of the application
      // using this Input to validate and THROW an error with the name 'MessageValidationError'
      // which this method will catch and treat differently!
      let amqpMessage: ICoreAmqpMessage = {
        amqpMessageContent: msg.content.toString(),
        amqpMessageFields: msg.fields,
        amqpMessageProperties: msg.properties
      };

      // And an object for our context
      let context: any = {};

      // Call the inputContextCallback if we were passed one
      if (this.options.inputContextCallback) {
        context = _.merge(context, this.options.inputContextCallback(msg));
      }

      this.logger.debug(`AmqpInputProvider.amqpHandler - amqpMessage: ${util.inspect(amqpMessage)}`);

      // Call our handler with the message object
      await this.handler({amqpMessage: amqpMessage}, context);

      // Ack the message
      channel.ack(msg);

    } catch (e) {
      // Handle errors!

      // If this is a message validation error then we do not need to retry because this is not going to magically be fixed.
      // Note: Applications using this Input are expected to return an error name == 'MessageValidationError'
      // to trigger this first condition! These messages, since they are invalid, are ACK so that they don't
      // requeue forever! (They're expected to fail any retry, since they're invalid!)
      if (e.name === 'MessageValidationError') {
        this.logger.error(`AmqpInputProvider.amqpHandler: Validation Error: ${e.message}`);
        this.logger.trace(`The message contained: ${msg.content.toString()}`)
        this.logger.trace(`The message fields contained: ${util.inspect(msg.fields)}`)
        this.logger.trace(`The message properties contained: ${util.inspect(msg.properties)}`)
        // Since we're dealing with INVALID messages (as defined by the application using this Input) we
        // ACK so we don't requeue the messages forever!
        channel.ack(msg);
      } else {
        // Otherwise, the error is something other than INVALID MESSAGE, so we deal with it.
        this.logger.error(`AmqpInputProvider.amqpHandler - Will Nack Message - INNER ERROR: ${e.message}`);
        // TODO: Implement a requeueHandler callback - it will get the ORIGINAL message and context since
        //  we don't have access to the changed facts, and will control requeue more than just "same queue". It
        //  should work in concert with requeueOnNack.
        // Nack the message and requeue only based on the options passed to this input
        channel.nack(msg, false, this.options.requeueOnNack || false);
      }
    }
    this.logger.trace(`RuleInputProviderAmqp.amqpHandler: End`);
  }
}