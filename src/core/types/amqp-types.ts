/**
 * Core AMQP Message - Use for the Core AMQP Input
 *
 * This object is used by AMQP Input to pass in all the pieces of a message that has been received.
 *
 * Refer to https://www.squaremobius.net/amqp.node/channel_api.html#channel_consume for details
 * on message fields and properties.
 */
export interface ICoreAmqpMessage {
  // The content of the message, already as a string. Applications should JSON.PARSE or otherwise verify the structure
  // is as expected by the application.
  amqpMessageContent: string;
  // The content of the AMQP message "fields" property as an object.
  amqpMessageFields: object;
  // The content of the AMQP message "properties" property as an object, including any message headers.
  amqpMessageProperties: object;
}

/**
 * Core AMQP Publish Action - Used for the Core AMQP Output
 *
 * This object is used to control what the Core AMQP Output publishes.
 *
 * This is intended to be passed inside an ARRAY of these in order to send multiple messages!
 */
export interface ICoreAmqpPublishAction {
  // The exchange to publish into
  amqpPublishExchange: string;
  // The content of the message, which should already be a string. Applications should JSON.stringify before passing.
  amqpMessageContent: string;
  // Optional, a routing key to use when publishing the message into the Exchange.
  amqpPublishRoutingKey?: string;
  // amqpPublishOptions should be formed per https://www.squaremobius.net/amqp.node/channel_api.html#channel_publish
  // options! This allows setting headers, expiration, etc.
  amqpPublishOptions?: object;
}

/**
 * Core AMQP RPC Publish Action - Used for the Core AMQP RPC Output
 *
 * This object is used to control what the Core AMQP RPC Output publishes.
 *
 * This is intended to be passed as a single property inside an updated facts object amqpRpcPublishAction.
 */
export interface ICoreAmqpRpcPublishAction {
  // The content of the response message, which should already be a string. Applications should JSON.stringify before passing.
  amqpRpcResponse: string;
}
