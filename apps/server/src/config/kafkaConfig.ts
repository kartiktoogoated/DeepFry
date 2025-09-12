
import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

const envSchema = z.object({
  KAFKA_BOOTSTRAP_SERVERS: z
    .string()
    .nonempty()
    .describe("Comma-separated list of Kafka brokers"),
  KAFKA_TOPIC: z
    .string()
    .default("validator-logs")
    .describe("Kafka topic for validator logs"),
  KAFKA_CONSENSUS_TOPIC: z
    .string()
    .default("validator-consensus")
    .describe("Kafka topic for consensus results"),
});

export type KafkaConfig = z.infer<typeof envSchema>;
export const kafkaConfig = envSchema.parse(process.env);

export const kafkaBrokerList = kafkaConfig.KAFKA_BOOTSTRAP_SERVERS
  .split(",")
  .map((brokerUrl) => brokerUrl.trim());