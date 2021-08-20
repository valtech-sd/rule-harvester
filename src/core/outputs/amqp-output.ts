import { IOutputProvider, IOutputResult } from '../../types';
import { ICoreAmqpPublishAction } from '../types/amqp-types';
import AmqpCacoon, {
  ConsumeMessage,
  Channel,
  ChannelWrapper,
} from 'amqp-cacoon';
import { Logger } from 'log4js';
import _ from 'lodash';
import { default as util } from 'util';

/**
 * Rule Output Provider Amqp
 *
 * This class wires up the AmqpCacoon to a rule output provider.
 *
 * Usage:
 * 1. Instantiate the class and pass in the instantiated amqpCacoon and logger
 * 2. call registerHandler to register the input callback
 * 3. When input comes in, the handler registered in step 2 will be called
 *
 **/
export default class CoreOutputAmqp implements IOutputProvider {
  private alreadyRegistered: boolean;
  private logger: Logger;
  private amqpCacoon: AmqpCacoon;
  private amqpPublishChannelWrapper!: ChannelWrapper;

  /**
   * constructor
   *
   * This function sets class level variables.
   *
   * @param amqpCacoon - an instance of AMQP Cacoon which will manage all AMQP communications.
   * @param logger - a log4js logger instance to use for logging.
   **/
  constructor(amqpCacoon: AmqpCacoon, logger: Logger) {
    this.alreadyRegistered = false;
    // Save the constructor parameters to local class variables
    this.logger = logger;
    this.amqpCacoon = amqpCacoon;
  }

  /**
   * outputResult
   *
   * Outputs a result from a rules engine pass.
   *
   * Does this by...
   * 1. Receives a result
   * 2. Analyzes the incoming result object <IOutputResult>result.
   * 3. If there is NO incoming error, pulls facts, inspects for an amqpPublishAction matching <ICoreAmqpPublishAction>.
   * 4. If it finds an <ICoreAmqpPublishAction>amqpPublishAction object, attempts to publish based on that.
   *
   * <ICoreAmqpPublishAction>
   * A rules engine implementation that wants to use the Core AMQP Output should pass the special object
   * amqpPublishAction as part of the facts object. That object in turn should contain the following, either as
   * a single instance OR as an ARRAY of these:
   * - amqpMessageContent: string - The content of the message, which should already be a string. Applications should
   *   JSON.stringify before passing.
   * - amqpPublishRoutingKey?: string - Optional, a routing key to use when publishing the message into the Exchange.
   * - amqpPublishOptions?: object, - Optional but if passed should be formed per
   *   https://www.squaremobius.net/amqp.node/channel_api.html#channel_publish. This allows setting headers, expiration
   *   amd more.
   *
   * @param result - <IOutputResult> the result of a rules engine pass, including error, facts and other object,
   *  as changed by the rules engine.
   * @returns Promise<void>
   **/
  async outputResult(result: IOutputResult) {
    this.logger.trace(`CoreOutputAmqp.outputResult: Start`);

    // Open our publish channel, but only if we've not already done it!
    if (!this.alreadyRegistered) {
      // Open our Publish Channel
      this.amqpPublishChannelWrapper =
        await this.amqpCacoon.getPublishChannel();
      // Make so we only register one publish channel
      this.alreadyRegistered = true;
    }

    // Process the incoming results
    try {
      if (result.error) {
        // The rules engine already sent in an error, so we just log and not output
        this.logger.error(
          `CoreOutputAmqp.outputResult: the result object contained an error. Nothing will publish. The error received was: ${util.inspect(
            result.error
          )}`
        );
      } else if (result?.facts?.amqpPublishAction) {
        // No error + we have an facts.amqpPublishAction so we publish!

        // Setup an array of actions so we can handle multiple.
        let amqpPublishArray: Array<ICoreAmqpPublishAction> = [];

        // Were we passed an ARRAY of amqpPublishAction in facts.amqpPublishAction?
        if (Array.isArray(result.facts.amqpPublishAction)) {
          // It is an array, so we just set our local to the array we were passed
          amqpPublishArray = result.facts.amqpPublishAction;
        } else {
          // Not an array, so let's add the one action into our local array
          amqpPublishArray.push(result.facts.amqpPublishAction);
        }

        // Now, let's loop over the array and publish each
        for (let amqpPublishAction of amqpPublishArray) {
          const amqpPublishExchange = amqpPublishAction.amqpPublishExchange;
          const amqpPublishRoutingKey =
            amqpPublishAction.amqpPublishRoutingKey || '';
          const amqpMessageContent = amqpPublishAction.amqpMessageContent || '';
          const amqpPublishOptions = amqpPublishAction.amqpPublishOptions;

          // Publish!
          await this.amqpPublishChannelWrapper.publish(
            amqpPublishExchange,
            amqpPublishRoutingKey,
            Buffer.from(amqpMessageContent),
            amqpPublishOptions
          );
          // Log success
          this.logger.info(
            `CoreOutputAmqp.outputResult: Message published to exchange='${amqpPublishExchange}' with routingKey='${amqpPublishRoutingKey}'.`
          );
        }
      } else {
        // We don't have an amqpPublishAction, so we log that.
        this.logger.error(
          `CoreOutputAmqp.outputResult: Error in retrieving an amqpPublishAction from result.facts. Nothing was published.`
        );
      }
    } catch (e) {
      // Oh no! Something else. Log the error.
      this.logger.error(
        `CoreOutputAmqp.outputResult: Error - INNER ERROR: ${e.message}`
      );
    }

    this.logger.trace(`CoreOutputAmqp.outputResult: End`);
  }
}
