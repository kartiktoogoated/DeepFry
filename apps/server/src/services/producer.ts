import { Kafka, logLevel } from "kafkajs";
import { info, warn, error as logError } from "../../utils/logger";
import { kafkaBrokerList, kafkaConfig } from "../config/kafkaConfig";


export interface LogEntry {
  validatorId: number;
  url: string;
  status: "UP" | "DOWN";
  latencyMs: number;
  timestamp: string;
}

export interface AlertEntry extends LogEntry {
  userId: number;
}

export interface OtpRequest {
  userId: string;
  email: string;
  otp: string;
  verificationLink?: string;
}


const kafka = new Kafka({
  clientId: process.env.IS_AGGREGATOR === 'true' ? 'aggregator' : 'validator',
  brokers: (process.env.KAFKA_BOOTSTRAP_SERVERS || 'kafka:9092').split(','),
});

let producer = kafka.producer();
let isConnected = false;

async function connectProducerWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      if (!isConnected) {
        await producer.connect();
        isConnected = true;
      }
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

export async function sendToTopic(topic: string, message: any) {
  await connectProducerWithRetry();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
}


export async function publishHealthCheck(
  entry: LogEntry,
  alertUserId?: number
): Promise<void> {
  try {
    await sendToTopic("health-logs", entry);
    info(`Logged [${entry.status}] for ${entry.url}`);

    if (entry.status === "DOWN" && alertUserId !== undefined) {
      const alertPayload: AlertEntry = { ...entry, userId: alertUserId };
      await sendToTopic("health-alerts", alertPayload);
      warn(`Enqueued alert for user ${alertUserId} on ${entry.url}`);
    }
  } catch (err) {
    logError(`Error publishing health check: ${err}`);
  }
}


export async function publishOtpRequest(request: OtpRequest): Promise<void> {
  try {
    await sendToTopic("otp-requests", request);
    info(`Enqueued OTP request for user ${request.userId}`);
  } catch (err) {
    logError(`Failed to enqueue OTP request for user ${request.userId}: ${err}`);
  }
}
