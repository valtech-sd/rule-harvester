"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/****
 *  closureGenerator
 *  This generates a closure definition
 *  @param name: string - Name of closure
 *  @param handler: (facts:any, context: any) handler - Handler used to run closure
 *  @param options:any - Optional parameter used to define required parameters for closure
 *  @return Returns closure definition
 ****/
function closureGenerator(name, handler, options) {
    return {
        name: name,
        handler: handler,
        options: options,
    };
}
exports.closureGenerator = closureGenerator;
//# sourceMappingURL=generators.js.map