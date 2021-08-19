const secrets = require('./secrets.json');
const fs = require('fs');

// TODO: KNOWN ISSUE - AMQPCACOON is not connecting over amqps/port5671. Issue is with one of the underlying library!
//  Monitor and update this example as soon as the underlying issue is resolved.

const amqpConfig = {
  // Protocol should be "amqps" or "amqp"
  protocol: 'amqp',
  // Username + Password on the RabbitMQ host
  username: secrets.amqpUsername,
  password: secrets.amqpPassword,
  // Host
  host: 'localhost',
  // Port AMQPS=5671, AMQP=5672
  port: 5672,
  // AMQP Options
  amqp_opts: {
    // If using AMQPS, we need to pass the contents of your CA file as a buffer into the broker host via amqp_opts.
    // This is facilitated for you here. Just copy your CA CERT file to the same location as this config file
    // then edit the secrets.json file to enter the NAME of your CA CERT file! Don't forget to set 'amqps' and
    // 'port' to the corresponding AMQPS values also in this configuration!
    ca:
      this.protocol === 'amqps'
        ? [
            fs.readFileSync(
              __dirname + '/' + secrets.amqpCACertName || 'ca_certificate.pem'
            ),
          ]
        : null,
  },
  // Queue + Exchange that we'll be using
  exampleQueue: 'example-queue',
  exampleExchange: 'example-exchange',
};

module.exports = amqpConfig;
