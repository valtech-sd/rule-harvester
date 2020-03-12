const log4js = require('log4js');

let logger = log4js.getLogger();
logger = log4js.getLogger('synchronous');
logger.level = 'info';

module.exports = logger;
