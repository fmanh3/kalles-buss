"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeString = void 0;
const provider_1 = require("@poc/provider");
const consumeString = () => {
    const providerString = (0, provider_1.provideMagicString)();
    return `${providerString} and consumer`;
};
exports.consumeString = consumeString;
//# sourceMappingURL=index.js.map