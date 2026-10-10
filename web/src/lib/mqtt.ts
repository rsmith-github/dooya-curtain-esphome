import mqtt, { MqttClient, IClientOptions } from "mqtt";

const MQTT_BROKER = process.env.MQTT_BROKER || "";
const MQTT_USERNAME = process.env.MQTT_USERNAME || "";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "";
const MQTT_PORT = parseInt(process.env.MQTT_WSS_PORT || "8084", 10);

function generateClientId(): string {
  // Unique clientId per connection to prevent EMQX kicking off overlapping sessions
  return `web-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function getMqttOptions(): IClientOptions {
  return {
    clientId: generateClientId(),
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    protocol: "wss",
    port: MQTT_PORT,
    path: "/mqtt",
    connectTimeout: 10000,
    reconnectPeriod: 0, // Don't reconnect in serverless
    clean: true,
  };
}

// Publish a message and disconnect
export async function publishMessage(
  topic: string,
  payload: string,
  retain: boolean = false
): Promise<void> {
  if (!MQTT_BROKER) {
    throw new Error("MQTT_BROKER not configured");
  }

  return new Promise((resolve, reject) => {
    const url = `wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`;
    const client: MqttClient = mqtt.connect(url, getMqttOptions());

    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT connection timeout"));
    }, 10000);

    client.on("connect", () => {
      client.publish(topic, payload, { retain }, (err) => {
        clearTimeout(timeout);
        client.end();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      client.end(true);
      reject(err);
    });
  });
}

// Compute minimal wildcard patterns to cover a list of topics
// EMQX Serverless free plan limits clients to 10 subscriptions
function computeWildcardPatterns(topics: string[]): string[] {
  // Group topics by their first two path segments and use wildcards
  const prefixes = new Set<string>();
  for (const topic of topics) {
    const parts = topic.split("/");
    if (parts.length >= 2) {
      // Use first two segments + wildcard: "dooya/curtain/#", "dooya/schedule/#"
      prefixes.add(`${parts[0]}/${parts[1]}/#`);
    } else {
      // Single-segment topic, subscribe directly
      prefixes.add(topic);
    }
  }
  return Array.from(prefixes);
}

// Read retained messages from multiple topics
// Uses wildcard subscriptions to stay under EMQX's 10-subscription limit.
// Returns as soon as messages stop arriving (settling) or timeout is reached.
// Never blocks waiting for topics that may not have retained messages.
export async function readRetainedMessages(
  topics: string[]
): Promise<Record<string, string>> {
  if (!MQTT_BROKER) {
    throw new Error("MQTT_BROKER not configured");
  }

  const requestedTopics = new Set(topics);
  const wildcardPatterns = computeWildcardPatterns(topics);

  return new Promise((resolve, reject) => {
    const url = `wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`;
    const client: MqttClient = mqtt.connect(url, getMqttOptions());
    const messages: Record<string, string> = {};
    const receivedRequestedTopics = new Set<string>();
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let subscribeTime = 0;

    const done = () => {
      clearTimeout(maxTimeout);
      if (settleTimer) clearTimeout(settleTimer);
      client.end();
      resolve(messages);
    };

    // Maximum time to wait overall (4s to handle high-latency links)
    const maxTimeout = setTimeout(() => {
      if (settleTimer) clearTimeout(settleTimer);
      client.end(true);
      resolve(messages);
    }, 4000);

    // Settle timer: wait for messages to stop arriving
    // Ensures minimum 1200ms from subscribe for high-latency links (Vercel ↔ EMQX Singapore)
    const resetSettleTimer = () => {
      if (settleTimer) clearTimeout(settleTimer);
      
      const elapsed = Date.now() - subscribeTime;
      const minWait = Math.max(0, 1200 - elapsed);
      const settleWait = Math.max(500, minWait);
      
      settleTimer = setTimeout(done, settleWait);
    };

    client.on("connect", () => {
      client.subscribe(wildcardPatterns, { qos: 0 }, (err, granted) => {
        if (err) {
          console.error("MQTT subscribe error:", err.message);
          clearTimeout(maxTimeout);
          client.end(true);
          reject(err);
          return;
        }
        // Check for subscription failures in granted array
        if (granted) {
          const failed = granted.filter((g) => g.qos === 128);
          if (failed.length > 0) {
            const failedTopics = failed.map((g) => g.topic).join(", ");
            console.error(`MQTT subscription rejected for: ${failedTopics}`);
            clearTimeout(maxTimeout);
            client.end(true);
            reject(new Error(`Subscription rejected: ${failedTopics}`));
            return;
          }
        }
        subscribeTime = Date.now();
        // Don't start settle timer yet - wait for first message
      });
    });

    client.on("message", (topic, payload) => {
      // Only keep messages for topics we actually requested
      if (requestedTopics.has(topic)) {
        messages[topic] = payload.toString();
        receivedRequestedTopics.add(topic);
        
        // Got all requested topics? Return immediately
        if (receivedRequestedTopics.size >= topics.length) {
          done();
          return;
        }
      }
      
      // Start/reset settle timer after any message (even non-requested ones indicate broker activity)
      resetSettleTimer();
    });

    client.on("error", (err) => {
      console.error("MQTT client error:", err.message);
      clearTimeout(maxTimeout);
      if (settleTimer) clearTimeout(settleTimer);
      client.end(true);
      reject(err);
    });
  });
}

// MQTT Topics
export const TOPICS = {
  // Curtain control
  CURTAIN_COMMAND: "dooya/curtain/command",
  CURTAIN_STATE: "dooya/curtain/state",
  CURTAIN_AVAILABILITY: "dooya/curtain/availability",

  // Position tracking with confidence
  CURTAIN_POSITION: "dooya/curtain/position",
  CURTAIN_POSITION_KNOWN: "dooya/curtain/position_known",
  CURTAIN_MOVEMENT: "dooya/curtain/movement",
  CURTAIN_MOVEMENT_START_MS: "dooya/curtain/movement_start_ms",

  // Schedule control
  SCHEDULE_COMMAND: "dooya/schedule/command",
  SCHEDULE_STATE: "dooya/schedule/state",

  // Schedule settings
  PARTIAL_HOUR: "dooya/schedule/partial_hour",
  PARTIAL_HOUR_SET: "dooya/schedule/partial_hour/set",
  PARTIAL_MINUTE: "dooya/schedule/partial_minute",
  PARTIAL_MINUTE_SET: "dooya/schedule/partial_minute/set",
  PARTIAL_SECONDS: "dooya/schedule/partial_seconds",
  PARTIAL_SECONDS_SET: "dooya/schedule/partial_seconds/set",
  FULL_HOUR: "dooya/schedule/full_hour",
  FULL_HOUR_SET: "dooya/schedule/full_hour/set",
  FULL_MINUTE: "dooya/schedule/full_minute",
  FULL_MINUTE_SET: "dooya/schedule/full_minute/set",
};
