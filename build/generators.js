"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closureGenerator = void 0;
/****
 *  closureGenerator
 *  This generates a closure definition
 *  @param name: string - Name of closure
 *  @param handler: (facts:any, context: any) handler - Handler used to run closure
 *  @param options:any - Optional parameter used to define required parameters for closure
 *  @return Returns closure definition
 ****/
function closureGenerator(name, handlerOrRules, options) {
    var closure = {
        name: name,
        options: options,
    };
    if (Array.isArray(handlerOrRules)) {
        closure.rules = handlerOrRules;
    }
    else {
        closure.handler = handlerOrRules;
    }
    return closure;
}
exports.closureGenerator = closureGenerator;
//# sourceMappingURL=generators.js.map