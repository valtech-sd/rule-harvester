const _ = require('lodash');

// These are just example conditional closures
module.exports = [
  {
    /**
     * invalidOrderFile
     * example {closure: "invalidOrderFile"} - If the order file is not even valid
     * @param type
     * @return boolean - true if the order data is not valid JSON
     **/
    name: 'invalidOrderFile',
    handler(facts, context) {
      try {
        // The Directory Watcher Input just gives us "the order" and the input already
        // ensures it's JSON. So we don't need to repeat.

        // However, the AMQP Input gives us a special object and the property that
        // holds our message `amqpMessage`, and the message content `amqpMessageContent`,
        // could contain anything - even non JSON!
        if (facts.amqpMessage && facts.amqpMessage.amqpMessageContent) {
          // We have an amqpMessage so let's verify the amqpMessageContent is valid JSON.
          // This will THROW if we can't parse the JSON inside the amqp message content.
          JSON.parse(facts.amqpMessage.amqpMessageContent);
          // Note that another closure will take care of reformatting the message!
        }
        return false;
      } catch (ex) {
        return true;
      }
    },
  },
  {
    /**
     * invalidOrderUdp
     * example {closure: "invalidOrderUdp"} - Is the order even valid?
     * @param type
     * @return boolean - true if the order data is not valid JSON
     **/
    name: 'invalidOrderUdp',
    handler(facts, context) {
      try {
        // The UDP Input gives us a special object and the property that
        // holds our request (udpRequest).
        // udpRequest conforms to IProviderReq and contains:
        // - body: (string) - The received BODY as a string.
        // - remoteInfo: (object) - Remote address information
        // Ensure the request: has a body and remoteInfo
        return !(facts?.udpRequest?.body && facts?.udpRequest?.remoteInfo);
      } catch (ex) {
        return true;
      }
    },
  },
  {
    /**
     * invalidOrderHttpPost
     * example {closure: "invalidOrderHttpPost"} - If the order post is not even valid
     * @param type
     * @return boolean - true if the order data is not valid JSON
     **/
    name: 'invalidOrderHttpPost',
    handler(facts, context) {
      try {
        // The HTTP Input gives us a special object and the property that
        // holds our request (httpRequest).
        // httpRequest conforms to IProviderReq and contains:
        // - method: (string) - GET, PUT, DELETE, etc.
        // - body: (object) - The received BODY as an object.
        // - query: (object) - An object that has all the query string items.
        // - params?: (optional Array<string>) - This is the PATH of the request.
        // Ensure the request: is a POST + has a BODY
        return !(
          facts?.httpRequest?.body && facts?.httpRequest?.method === 'POST'
        );
      } catch (ex) {
        return true;
      }
    },
  },
  {
    /**
     * orderIsValid
     * example {closure: "orderIsValid"} - If the order is Valid
     * @param type
     * @return boolean - true if the order is valid
     **/
    name: 'orderIsValid',
    handler(facts, context) {
      return facts.orderIsValid;
    },
  },
  {
    /**
     * orderIsNotValid
     * example {closure: "orderIsNotValid"} - If the order is Valid
     * @param type
     * @return boolean - true if the order is not valid
     **/
    name: 'orderIsNotValid',
    handler(facts, context) {
      return !facts.orderIsValid;
    },
  },
  {
    /**
     * checkShippingAddress
     * @param type
     * @return boolean - true the two parameters passed match!
     **/
    name: 'checkShippingState',
    handler(facts, context) {
      return context.parameters.orderShippingState === context.parameters.state;
    },
    options: { required: ['orderShippingState', 'state'] },
  },
];
