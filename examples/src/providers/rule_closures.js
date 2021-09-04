// Bring in Core Conditionals and Transformations built into RuleHarvester
const {
  CoreClosures,
  CoreTransformations,
  CoreConditionals,
  CoreErrorHandling,
  CoreErrorHandlingHttp,
} = require('rule-harvester');

// Bring our own custom conditions, transformers and actions
const conditions = require('./rule_closures/conditions');
const transformers = require('./rule_closures/transformers');
const actions = require('./rule_closures/actions');

// Combine conditions, transformers and actions into an array that we export so we can use it in the rules engine instance.
module.exports = [].concat(
  // Coming from the Rule-Harvester!
  CoreTransformations,
  CoreConditionals,
  CoreErrorHandling,
  CoreErrorHandlingHttp,
  // Custom for the Example
  conditions,
  transformers,
  actions
);
