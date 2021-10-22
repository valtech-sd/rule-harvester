const secrets = require('./secrets.json');
const fs = require('fs');

// Enter either "amqp" or "amqps"
const protocol = 'amqps';

const amqpConfig = {
  // Protocol should be "amqps" or "amqp"
  protocol: protocol,
  // Username + Password on the RabbitMQ host
  username: secrets.amqpUsername,
  password: secrets.amqpPassword,
  // Host
  host: 'localhost',
  // Port AMQPS=5671, AMQP=5672
  port: protocol === 'amqps' ? 5671 : 5672,
  // AMQP Options which should conform to <AmqpConnectionManagerOptions>
  amqp_opts: {
    // Pass options to node amqp connection manager (a wrapper around AMQPLIB)
    // See connect(urls, options) in https://www.npmjs.com/package/amqp-connection-manager
    heartbeatIntervalInSeconds: 5, // Default
    reconnectTimeInSeconds: 5, // Default

    // Pass options into the underlying AMQPLIB.
    // See AMQPLIB SocketOptions https://www.squaremobius.net/amqp.node/channel_api.html#connect
    connectionOptions: {
      // If using AMQPS, we need to pass the contents of your CA file as a buffer into the broker host via amqp_opts.
      // This is facilitated for you here. Just copy your CA CERT file to the same location as this config file
      // then edit the secrets.json file to enter the NAME of your CA CERT file! Don't forget to set 'amqps' and
      // 'port' to the corresponding AMQPS values also in this configuration!
      // See https://www.squaremobius.net/amqp.node/ssl.html for more details.
      ca:
        protocol === 'amqps'
          ? [
              fs.readFileSync(
                __dirname + '/' + secrets.amqpCACertName || 'ca_certificate.pem'
              ),
            ]
          : null,
    },
  },
  // Queues + Exchanges that we'll be using for the examples
  exampleQueue: 'example-input-queue',
  exampleExchange: 'example-input-exchange',
  exampleQueueOutput: 'example-output-queue',
  exampleExchangeOutput: 'example-output-exchange',
  exampleQueueRpcResponse: 'example-rpc-output-queue',
};

module.exports = amqpConfig;
