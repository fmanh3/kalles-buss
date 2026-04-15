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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PubSubClient = void 0;
const pubsub_1 = require("@google-cloud/pubsub");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
/**
 * Infrastruktur-wrapper för GCP Pub/Sub.
 * Hanterar växling mellan lokal emulator och riktiga GCP-miljöer.
 */
class PubSubClient {
    pubsub;
    constructor() {
        this.pubsub = new pubsub_1.PubSub({
            projectId: process.env.PUBSUB_PROJECT_ID || 'kalles-buss-local',
            // Emulator-detektering: Om PUBSUB_EMULATOR_HOST finns, används den automatiskt av SDK:et.
        });
    }
    /**
     * Säkerställer att en Topic finns innan vi skickar till den.
     */
    async ensureTopic(topicName) {
        const [exists] = await this.pubsub.topic(topicName).exists();
        if (!exists) {
            console.log(`[PubSub] Skapar topic: ${topicName}`);
            await this.pubsub.createTopic(topicName);
        }
    }
    /**
     * Publicerar ett meddelande asynkront.
     */
    async publish(topicName, data) {
        await this.ensureTopic(topicName);
        const topic = this.pubsub.topic(topicName);
        const dataBuffer = Buffer.from(JSON.stringify(data));
        try {
            const messageId = await topic.publishMessage({ data: dataBuffer });
            console.log(`[PubSub] Meddelande publicerat till ${topicName}. ID: ${messageId}`);
            return messageId;
        }
        catch (error) {
            console.error(`[PubSub] Fel vid publicering:`, error);
            throw error;
        }
    }
    /**
     * Skapar en prenumeration för att kunna demonstrera "The Loop".
     */
    async subscribe(topicName, subscriptionName, handler) {
        await this.ensureTopic(topicName);
        const [subExists] = await this.pubsub.subscription(subscriptionName).exists();
        if (!subExists) {
            console.log(`[PubSub] Skapar prenumeration: ${subscriptionName}`);
            await this.pubsub.topic(topicName).createSubscription(subscriptionName);
        }
        const subscription = this.pubsub.subscription(subscriptionName);
        subscription.on('message', (message) => {
            const data = JSON.parse(message.data.toString());
            handler(data);
            message.ack();
        });
        console.log(`[PubSub] Lyssnar på ${subscriptionName}...`);
    }
}
exports.PubSubClient = PubSubClient;
//# sourceMappingURL=pubsub-client.js.map