/**
 * Infrastruktur-wrapper för GCP Pub/Sub.
 * Hanterar växling mellan lokal emulator och riktiga GCP-miljöer.
 */
export declare class PubSubClient {
    private pubsub;
    constructor();
    /**
     * Säkerställer att en Topic finns innan vi skickar till den.
     */
    ensureTopic(topicName: string): Promise<void>;
    /**
     * Publicerar ett meddelande asynkront och skickar med correlationId (Trace).
     */
    publish(topicName: string, data: any): Promise<string>;
    /**
     * Skapar en prenumeration för att kunna demonstrera "The Loop".
     * Knyter inkommande Pub/Sub meddelanden till rätt Trace ID.
     */
    subscribe(topicName: string, subscriptionName: string, handler: (data: any) => void): Promise<void>;
}
