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

    const timeout = setTimeout(() => {
      client.end(true);
      // Return whatever we got, even if incomplete
      resolve(messages);
    }, 5000);

    client.on("connect", () => {
      client.subscribe(topics, { qos: 0 }, (err) => {
        if (err) {
          clearTimeout(timeout);
          client.end(true);
          reject(err);
        }
      });
    });

    client.on("message", (topic, payload) => {
      messages[topic] = payload.toString();
      receivedTopics.add(topic);

      // Check if we got all topics
      if (receivedTopics.size >= topics.length) {
        clearTimeout(timeout);
        client.end();
        resolve(messages);
      }
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
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
