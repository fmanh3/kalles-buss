"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../index");
(0, vitest_1.describe)('Consumer', () => {
    (0, vitest_1.it)('should consume the string from the provider', () => {
        const result = (0, index_1.consumeString)();
        (0, vitest_1.expect)(result).toBe('Hello from provider and consumer');
    });
});
//# sourceMappingURL=index.test.js.map