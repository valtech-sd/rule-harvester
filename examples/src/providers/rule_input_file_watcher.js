const chokidar = require('chokidar');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
var path = require('path');

module.exports = class RuleInputProviderFileWatcher {
  // registerHandler
  // This function is called from the RuleHarvester when start() is called.
  // This is where the RuleHarvester registers itself with this input provider
  async registerInput(applyInputCb) {
    // Event handler for the file watcher
    const handleEvent = async path => {
      try {
        // Read file as string
        const inputStr = await readFile(path);
        console.log(path, inputStr.toString());
        // Convert to json
        const inputObj = JSON.parse(inputStr);
        // Add file path to input
        inputObj.file = path;
        // Delete file
        await unlink(path);

        // Pass to rules harvester
        await applyInputCb(inputObj);
      } catch (e) {
        console.log('Input Handler Error', e, path);
      }
    };

    // Setup a file watcher
    chokidar
      .watch(path.resolve(__dirname) + '/../../input_watch_path')
      .on('add', handleEvent)
      .on('chnage', handleEvent);

    console.log(
      'RuleHarvester Example started. Copy an example order file into ./examples/input_watch_path then view the output in ./examples/output_order_dispatch'
    );
  }
};
