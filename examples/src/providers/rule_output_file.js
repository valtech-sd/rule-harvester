const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const path = require('path');
const logger = require('./custom_logger');

module.exports = class RuleOutputProviderFile {
  // The rules Harvester will call the outputResult function after it is done processing input
  async outputResult({ facts, error, errorGroup, context }) {
    if (!error) {
      // This writes a file to the ./output_order_dispatch directory
      // It writes an output string that was built during the rule evaluation.
      // Note here we get the file name from the context which was added to the
      // runtime environment by the INPUT PROVIDER.
      await writeFile(
        `${path.resolve(__dirname)}/../../output_order_dispatch/${path.basename(
          context.orderFile
        )}.txt`,
        facts.orderDispatch
      );
      logger.debug('Facts At Completion', facts);
    } else {
      logger.error(
        'Output Provider - Error during provider run',
        error,
        errorGroup
      );
    }
  }
};
