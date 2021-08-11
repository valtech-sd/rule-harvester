// Bring our own custom conditions, transformers and actions
const conditions = require('./rule_closures/conditions');
const transformers = require('./rule_closures/transformers');
const actions = require('./rule_closures/actions');

// Combine conditions, transformers and actions into an array
module.exports = [].concat(conditions, transformers, actions);
