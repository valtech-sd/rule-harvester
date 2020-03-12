const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
var path = require('path');

module.exports = class RuleOutputProviderFile {
  // The rules Harvester will call the outputResult function after it is done processing input
  async outputResult({ facts, error, errorGroup }) {
    if (!error) {
      // This wriets a file to the ./output_order_dispatch directory
      // it uses the string that was built during the rules Harvester.
      // Equally this could do something that causes the order to be emailed to someone
      await writeFile(
        `${path.resolve(__dirname)}/../../output_order_dispatch/${path.basename(
          facts.file
        )}.txt`,
        facts.orderDispatch
      );
      console.log('Facts At Completion', facts);
    } else {
      console.error(
        'Output Provider - Error during provider run',
        error,
        errorGroup
      );
    }
  }
};
