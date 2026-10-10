import mqtt, { MqttClient, IClientOptions } from "mqtt";

const MQTT_BROKER = process.env.MQTT_BROKER || "";
const MQTT_USERNAME = process.env.MQTT_USERNAME || "";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "";
const MQTT_PORT = parseInt(process.env.MQTT_WSS_PORT || "8084", 10);

function getMqttOptions(): IClientOptions {
  return {
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

// Read retained messages from multiple topics
// Returns as soon as messages stop arriving (settling) or timeout is reached.
// Never blocks waiting for topics that may not have retained messages.
export async function readRetainedMessages(
  topics: string[]
): Promise<Record<string, string>> {
  if (!MQTT_BROKER) {
    throw new Error("MQTT_BROKER not configured");
  }

  return new Promise((resolve, reject) => {
    const url = `wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`;
    const client: MqttClient = mqtt.connect(url, getMqttOptions());
    const messages: Record<string, string> = {};
    const receivedTopics = new Set<string>();
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    // Maximum time to wait overall
    const maxTimeout = setTimeout(() => {
      if (settleTimer) clearTimeout(settleTimer);
      client.end(true);
      resolve(messages);
    }, 3000);

    // After receiving a message, wait briefly for more before resolving
    // This handles the case where retained messages arrive in quick succession
    const resetSettleTimer = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        clearTimeout(maxTimeout);
        client.end();
        resolve(messages);
      }, 500); // 500ms settle time - if no new messages, we're done
    };

    client.on("connect", () => {
      client.subscribe(topics, { qos: 0 }, (err) => {
        if (err) {
          clearTimeout(maxTimeout);
          if (settleTimer) clearTimeout(settleTimer);
          client.end(true);
          reject(err);
          return;
        }
        // Start settle timer after subscription - retained messages should arrive quickly
        resetSettleTimer();
      });
    });

    client.on("message", (topic, payload) => {
      messages[topic] = payload.toString();
      receivedTopics.add(topic);
      
      // Got all topics? Return immediately
      if (receivedTopics.size >= topics.length) {
        clearTimeout(maxTimeout);
        if (settleTimer) clearTimeout(settleTimer);
        client.end();
        resolve(messages);
        return;
      }
      
      // Reset settle timer on each message
      resetSettleTimer();
    });

    client.on("error", (err) => {
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
