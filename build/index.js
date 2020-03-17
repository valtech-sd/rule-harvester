"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-ignore
var rules_js_1 = __importDefault(require("rules-js"));
var lodash_1 = __importDefault(require("lodash"));
__export(require("./generators"));
var RuleHarvester = /** @class */ (function () {
    /**
     * Constructor
     * This function configures the engine.
     * 1. Instantiates the engine
     * 2. Sets up the engine corpus (definitions)
     * 3. Sets of the closers (Available funciton closures for the corpus to work from)
     * @params config: IRuleHarvesterConfig
     * @returns - None
     **/
    function RuleHarvester(config) {
        this.forbidenExtraContext = [
            'engine',
            'parameters',
            'rulesFired',
            'currentRuleFlowActivated',
            'fact',
        ];
        this.providers = config.providers;
        this.config = config;
        this.logger = config.providers.logger;
        this.extraContext = config.extraContext;
        this.ruleGroups = [];
        try {
            // Make sure extraContext is not using forbidden fields
            var badContext = lodash_1.default.intersection(lodash_1.default.keys(this.extraContext), this.forbidenExtraContext);
            if ((badContext || []).length > 0) {
                throw new Error("One of the extraContext fields specified is forbidden and could mess with the rules engine. (" + badContext.join(', ') + ")");
            }
            // This will be extend the context and be passed into closure handler functions
            this.extraContext = lodash_1.default.defaults({}, config.extraContext || {}, {
                logger: this.logger,
            });
            // Instantiate rules engine
            this.engine = new rules_js_1.default();
            // Sets up closures for the provider for the rules engine
            for (var _i = 0, _a = this.providers.closures; _i < _a.length; _i++) {
                var closure = _a[_i];
                closure = this.closureHandlerWrapper(closure); // Wraps handler if needed
                if (!closure.handler && closure.name && closure.rules) {
                    this.engine.add(closure, closure.options);
                }
                else {
                    this.engine.closures.add(closure.name, closure.handler, closure.options);
                }
            }
            // Add corpus definitions to the engine
            for (var _b = 0, _c = this.providers.corpus; _b < _c.length; _b++) {
                var corpus = _c[_b];
                this.ruleGroups.push(corpus.name);
                this.engine.add({
                    name: corpus.name,
                    rules: corpus.rules,
                });
            }
        }
        catch (e) {
            if (this.logger) {
                this.logger.fatal('RuleHarvester - Error during harvester engine setup.', e);
            }
            throw e;
        }
    }
    /*****************
     * defaultClosureHandlerWrapper
     * This wraps the closure handler so that we log errors well
     ******************/
    RuleHarvester.prototype.defaultClosureHandlerWrapper = function (name, handler, options) {
        var _this = this;
        return function (facts, context) { return __awaiter(_this, void 0, void 0, function () {
            var result, contextExt, _a, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        contextExt = lodash_1.default.defaults(context, this.extraContext);
                        contextExt.closureName = name;
                        contextExt.closureOptions = options;
                        if (!this.config.closureHandlerWrapper // closureHandlerWrapper exist
                        ) return [3 /*break*/, 2]; // closureHandlerWrapper exist
                        return [4 /*yield*/, this.config.closureHandlerWrapper(facts, contextExt, handler)]; // then call wrapper funtion
                    case 1:
                        _a = _b.sent(); // then call wrapper funtion
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, handler(facts, contextExt)];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        result = _a; // else call handler directly
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _b.sent();
                        if (this.logger) {
                            this.logger.error("RuleHarvester.defaultClosureHandlerWrapper - Closure Name: " + name + " - Error: ", e_1);
                        }
                        throw e_1;
                    case 6: return [2 /*return*/, result];
                }
            });
        }); };
    };
    /**
     * closureHandlerWrapper
     * This function is a wrapper to allow us to override the context of closure functions.
     * it wraps the closure handler to supply extra context if the handler is defined.
     *
     * @param closure - The defined closure function
     * @return returns a wrapped closure function
     **/
    RuleHarvester.prototype.closureHandlerWrapper = function (closure) {
        if (closure.handler) {
            closure.handler = this.defaultClosureHandlerWrapper(closure.name, closure.handler, closure.options);
        }
        return closure;
    };
    /**
     * start the Rules Harvester.
     * Does this by...
     * 1. Does this by registering an input handler for each rule input
     * @params - None
     * @returns void
     **/
    RuleHarvester.prototype.start = function () {
        // We bind to the applyRule to this because otherwise the calling context would
        // be from the input provider insetad of the local class
        for (var _i = 0, _a = this.providers.inputs; _i < _a.length; _i++) {
            var ruleInput = _a[_i];
            ruleInput.registerInput(this.applyRule.bind(this));
        }
    };
    /**
     * applyRule - Applies the rule to the rules engine
     * If input is not null then ..
     * 1. Process rules using the rules engine
     * 2. Send the resulting facts to the output providers
     **/
    RuleHarvester.prototype.applyRule = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var fact, group, error, _i, _a, e_2, proms, _b, _c, output, e_3;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!input) return [3 /*break*/, 11];
                        fact = input;
                        group = input;
                        error = null;
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 6, , 7]);
                        _i = 0, _a = this.ruleGroups;
                        _d.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        group = _a[_i];
                        return [4 /*yield*/, this.engine.process(group, fact)];
                    case 3:
                        // Loop over grouops and set the fact from previous
                        // rules group to the input fact for the next rules grup
                        (fact = (_d.sent()).fact);
                        _d.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        e_2 = _d.sent();
                        error = e_2;
                        if (this.logger) {
                            this.logger.error('RuleHarvester - Error: An error occurred while processing rule', "GROUP: " + group + ", fact: " + JSON.stringify(fact, null, 2), e_2);
                        }
                        return [3 /*break*/, 7];
                    case 7:
                        _d.trys.push([7, 9, , 10]);
                        proms = [];
                        for (_b = 0, _c = this.providers.outputs; _b < _c.length; _b++) {
                            output = _c[_b];
                            proms.push(output.outputResult({
                                facts: fact,
                                error: error,
                                errorGroup: error ? group : undefined,
                            }));
                        }
                        return [4 /*yield*/, Promise.all(proms)];
                    case 8:
                        _d.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        e_3 = _d.sent();
                        error = e_3;
                        if (this.logger) {
                            this.logger.error('RuleHarvester - Error: An error occurred while processing rule', "GROUP: " + group + ", fact: " + JSON.stringify(fact, null, 2), e_3);
                        }
                        return [3 /*break*/, 10];
                    case 10:
                        // If an error occured we want to throw it back to the input provider
                        if (error)
                            throw error;
                        _d.label = 11;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    return RuleHarvester;
}());
exports.default = RuleHarvester;
//# sourceMappingURL=index.js.map