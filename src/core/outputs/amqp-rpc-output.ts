import { ILogger, IOutputProvider, IOutputResult } from '../../types';
import { ICoreAmqpRpcPublishAction } from '../types/amqp-types';
import AmqpCacoon, { ChannelWrapper } from 'amqp-cacoon';
import _ from 'lodash';
import { default as util } from 'util';

/**
 * Rule Output Provider Amqp RPC (remote procedure call)
 *
 * This class wires up the AmqpCacoon to a rule output provider for an AMQP RPC Response.
 *
 * Usage:
 * 1. Instantiate the class and pass in the instantiated amqpCacoon and logger
 * 2. call registerHandler to register the input callback
 * 3. When input comes in, the handler registered in step 2 will be called
 *
 **/
export default class CoreOutputAmqpRpc implements IOutputProvider {
  private alreadyRegistered: boolean;
  private logger?: ILogger;
  private amqpCacoon: AmqpCacoon;
  private amqpPublishChannelWrapper!: ChannelWrapper;

  /**
   * constructor
   *
   * This function sets class level variables.
   *
   * @param amqpCacoon - an instance of AMQP Cacoon which will manage all AMQP communications.
   * @param logger - a logger instance to use for logging.
   **/
  constructor(amqpCacoon: AmqpCacoon, logger: ILogger) {
    this.alreadyRegistered = false;
    // Save the constructor parameters to local class variables
    this.logger = logger;
    this.amqpCacoon = amqpCacoon;
  }

  /**
   * outputResult
   *
   * Outputs a result from a rules engine pass IF the result facts contains an AMQP RPC Response!
   *
   * Does this by...
   * 1. Receives a result
   * 2. Analyzes the incoming result object <IOutputResult>result.
   * 3. If there is NO incoming error, pulls facts, inspects for an amqpRpcPublishAction matching <ICoreAmqpRpcPublishAction>.
   * 4. If it finds an <ICoreAmqpRpcPublishAction>amqpRpcPublishAction object, attempts to publish based on that.
   *
   * <ICoreAmqpRpcPublishAction>
   * A rules engine implementation that wants to use the Core AMQP RPC Output should pass the special object
   * amqpRpcPublishAction as part of the facts object. That object in turn should contain the following, as
   * a single instance (array not supported here and if passed, only the first item will be returned):
   * - amqpMessageContent: string - The content of the message, which should already be a string. Applications should
   *   JSON.stringify before passing.
   *
   * Note that the replyTo queue and correlationId (both part of the AMQP RPC protocol) are extracted from the
   * original input message properties. Also, per the RPC Protocol spec, the REPLY TO QUEUE must exist already
   * since it should be created/asserted by the client application that sends the original message.
   *
   * @param result - <IOutputResult> the result of a rules engine pass, including error, facts and other object,
   *  as changed by the rules engine.
   * @returns Promise<void>
   **/
  async outputResult(result: IOutputResult) {
    this.logger?.trace(`CoreOutputAmqpRpc.outputResult: Start`);

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
        this.logger?.error(
          `CoreOutputAmqpRpc.outputResult: the result object contained an error. Nothing will publish. The error received was: ${util.inspect(
            result.error
          )}`
        );
      } else if (
        result?.facts?.amqpMessage &&
        result?.facts?.amqpRpcPublishAction
      ) {
        // No error + we have an original amqpMessage + amqpRpcPublishAction so we publish!

        const originalMessage = result.facts.amqpMessage;
        const replyTo = originalMessage.amqpMessageProperties.replyTo;
        const correlationId =
          originalMessage.amqpMessageProperties.correlationId;

        // Do we have a replyTo and a correlationId?
        if (replyTo && correlationId) {
          // Setup an array of actions so we can handle multiple (though not supported
          // we check just in case).
          let amqpRpcPublishArray: Array<ICoreAmqpRpcPublishAction> = [];

          // Were we passed an ARRAY of amqpPublishAction in facts.amqpPublishAction?
          if (Array.isArray(result.facts.amqpRpcPublishAction)) {
            // It is an array, so we just set our local to the array we were passed
            amqpRpcPublishArray = result.facts.amqpRpcPublishAction;
          } else {
            // Not an array, so let's add the one action into our local array
            amqpRpcPublishArray.push(result.facts.amqpRpcPublishAction);
          }

          // Now, we force a response of a single item, the first one!
          const amqpRpcResponse = amqpRpcPublishArray[0].amqpRpcResponse || '';

          // Publish!
          await this.amqpPublishChannelWrapper.sendToQueue(
            replyTo,
            Buffer.from(amqpRpcResponse),
            { correlationId: correlationId }
          );
          // Log success
          this.logger?.info(
            `CoreOutputAmqpRpc.outputResult: Message published to reply-to='${replyTo}'.`
          );
        } else {
          // We don't have a replyTo nor correlationId, so we log that.
          this.logger?.error(
            `CoreOutputAmqpRpc.outputResult: Error in executing amqpRpcPublishAction from result.facts. The original message did not have the required properties "reply_to" and "correlation_id". Unable to respond via AMQP RPC.`
          );
        }
      } else {
        if (
          !result?.facts?.amqpMessage &&
          result?.facts?.amqpRpcPublishAction
        ) {
          // We have an amqpRpcPublishAction, but we can't retrieve the original amqpMessage.
          // This means we won't be able to respond since the original message is needed to know how to respond!
          this.logger?.error(
            `CoreOutputAmqpRpc.outputResult: Error in retrieving the original amqpMessage for an amqpRpcPublishAction from result.facts. Nothing was published.`
          );
        }
      }
    } catch (e) {
      // Oh no! Something else. Log the error.
      this.logger?.error(
        `CoreOutputAmqpRpc.outputResult: Error - INNER ERROR: ${e.message}`
      );
    }

    this.logger?.trace(`CoreOutputAmqpRpc.outputResult: End`);
  }
}
