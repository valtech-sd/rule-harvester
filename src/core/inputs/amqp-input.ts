import { IInputProvider } from '../../types';
import AmqpCacoon, { ConsumeMessage, Channel } from 'amqp-cacoon';
import { Logger } from 'log4js';
import _ from 'lodash';

export interface IRuleInputProviderAmqpConfig {
  providers: {
    logger: Logger;
    amqpCacoon: AmqpCacoon;
  };
  amqpQueue: string;
}

/**
 * RuleInputProviderAmqp
 *
 * This class essentially converts the AmqpCacoon to a rule input provider
 * Usage:
 * 1. Instantiate the class and pass in the instantiated amqpCacoon and logger
 * 2. call registerHandler to register the input callback
 * 3. When input comes in, the handler registered in step 2 will be called
 *
 **/
export default class AmqpInputProvider implements IInputProvider {
  private handlers: Array<(input: any) => Promise<any>>;
  private alreadyRegistered: boolean;
  private logger: Logger;
  private amqpCacoon: AmqpCacoon;
  private amqpQueue: string;

  /**
   * constructor
   *
   * This function sets class level variables.
   *
   * @param config - Contains the providers required
   **/
  constructor(config: IRuleInputProviderAmqpConfig) {
    this.alreadyRegistered = false;
    this.handlers = [];
    // Deconstruct the config to local class variables
    ({ logger: this.logger, amqpCacoon: this.amqpCacoon } = config.providers);
    this.amqpQueue = config.amqpQueue;
  }

  /**
   * registerHandler
   *
   * Does this by...
   * 1. Pushes the handler param onto a handlers array
   * 2. If this is the first call then we register the amqpHandler function with the amqp provider
   * *  If not the first call then we do nothing else
   *
   * @param applyInputCb - a handler that will be called when there is input
   * @returns Promise<void>
   **/
  async registerInput(applyInputCb: (input: any) => Promise<any>) {
    this.logger.trace(`RuleInputProviderAmqp.registerHandler: Start`);
    // Push applyInputCb onto the handler array
    this.handlers.push(applyInputCb);

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
   * @param channel: the active/open AMQP channel to consume from
   * @param msg: object - the message object
   * @return Promise<void>
   **/
  async amqpHandler(channel: Channel, msg: ConsumeMessage) {
    this.logger.trace(`RuleInputProviderAmqp.amqpHandler: Start`);
    try {
      let msgObj: any = { content: JSON.parse(msg.content.toString()) };
      ({ exchange: msgObj.exchange, routingKey: msgObj.routingKey } = msg.fields);

      // Find original routingKey
      msgObj.originalRoutingKey =
        ((_.get(msg, 'properties.headers.x-death') || []).find(
          (o: any) => (o || {}).queue === _.get(msg, 'properties.headers.x-first-death-queue'),
        ) || { 'routing-keys': [] })['routing-keys']![0] || msgObj.routingKey;

      // Find original exchange
      msgObj.originalExchange = _.get(msg, 'properties.headers.x-first-death-exchange');

      msgObj.properties = msg.properties;

      this.logger.trace('RuleInputProviderAmqp.amqpHandler() - Message: ', msgObj);
      this.logger.info(`---------Message Topic Rx: ${msgObj.routingKey} - Original: ${msgObj.originalRoutingKey}`);

      // Loop through the handlers
      for (let handler of this.handlers) {
        // Call each handler with the message object
        await handler({ message: msgObj });
      }

      // Ack the message
      channel.ack(msg);
    } catch (e) {
      // If this is a message validation error then we do not need to retry because this is not going to magically be fixed.
      // TODO: Explain better why the need for a certain error here to ACK an invalid message.
      // TODO: Replace a generic error with name == 'MessageValidationError' with something more generic.
      if (e.name === 'MessageValidationError') {
        this.logger.error(`RuleInputProviderAmqp.amqpHandler: Validation Error: `, e);
        channel.ack(msg);
      } else {
        this.logger.error(`RuleInputProviderAmqp.amqpHandler - Will Nack Message - Error: `, e);
        // Nack the message and do not requeue
        channel.nack(msg, false, false);
      }
    }
    this.logger.trace(`RuleInputProviderAmqp.amqpHandler: End`);
  }
}