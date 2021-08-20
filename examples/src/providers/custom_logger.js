const log4js = require('log4js');

// This is a simple logger that outputs to the console.
// This implements log4js. Learn more at https://stritti.github.io/log4js/docu/users-guide.html

let logger = log4js.getLogger();
logger = log4js.getLogger('synchronous');

// Set a log level that suits our needs.
// Supported Log Levels:
// OFF	 - nothing is logged
// FATAL - fatal errors are logged
// ERROR - errors are logged
// WARN	 - warnings are logged
// INFO	 - infos are logged
// DEBUG - debug infos are logged
// TRACE - traces are logged
// ALL   - everything is logged
logger.level = 'all';

module.exports = logger;
