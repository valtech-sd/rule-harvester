const conditions = require('./rule_closures/conditions');
const transformers = require('./rule_closures/transformers');
const actions = require('./rule_closures/actions');

// Just combine conditions, transformers and actions into an array
module.exports = [].concat(conditions, transformers, actions);
