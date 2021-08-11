const chokidar = require('chokidar');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const path = require('path');

module.exports = class RuleInputProviderDirectoryWatcher {
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
        const inputObj = JSON.parse(inputStr.toString());
        // Add context to input so we can store the file path of the order file
        let context = {orderFile: path};
        // Delete file
        await unlink(path);
        // Pass to rules harvester ("inputObj" will be passed as "facts" to the rules engine).
        await applyInputCb(inputObj, context);
      } catch (e) {
        console.log('Input Handler Error', e, path);
      }
    };

    // Setup a file watcher
    chokidar
      .watch(path.resolve(__dirname) + '/../../input_watch_path', {ignoreInitial: true})
      .on('add', handleEvent);

    console.log(
      'RuleHarvester Example started. Copy an example order file into ./examples/input_watch_path then view the output in ./examples/output_order_dispatch'
    );
  }
};
