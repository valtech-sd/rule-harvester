const conditions = require('./rule_closures/conditions');
const transformers = require('./rule_closures/transformers');
const actions = require('./rule_closures/actions');

module.exports = [].concat(conditions, transformers, actions);
