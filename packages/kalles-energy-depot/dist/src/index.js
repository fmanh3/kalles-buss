"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const knex_1 = __importDefault(require("knex"));
const knexfile_cjs_1 = __importDefault(require("../knexfile.cjs"));
const pubsub_1 = require("@google-cloud/pubsub");
const charger_agent_js_1 = require("./domain/charging/charger-agent.js");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function start() {
    const db = (0, knex_1.default)(knexfile_cjs_1.default.development);
    const chargerAgent = new charger_agent_js_1.ChargerAgent(db);
    const pubsub = new pubsub_1.PubSub({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'joakim-hansson-lab' });
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    const port = process.env.PORT || 8080;
    app.get('/', (req, res) => res.send('Kalles Energy Depot Domain is live! 🔋'));
    // Endpoint för att se aktuella laddningssessioner
    app.get('/sessions', async (req, res) => {
        const sessions = await db('charging_sessions').orderBy('start_time', 'desc').limit(10);
        res.json(sessions);
    });
    app.listen(port, () => console.log(`[Energy-Depot] API listening on port ${port}`));
    // Prenumerera på optimeringsorder från CFO (Milstolpe 9)
    const topicName = 'energy-optimization';
    const subscriptionName = 'depot-optimization-sub';
    const topic = pubsub.topic(topicName);
    const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });
    console.log(`[Energy-Depot] Lyssnar på ${topicName}...`);
    subscription.on('message', async (message) => {
        try {
            const strategy = JSON.parse(message.data.toString());
            await chargerAgent.applyOptimizationStrategy(strategy);
            message.ack();
        }
        catch (err) {
            console.error('[Energy-Depot] Fel vid hantering av optimeringsorder:', err);
        }
    });
}
start().catch(console.error);
//# sourceMappingURL=index.js.map