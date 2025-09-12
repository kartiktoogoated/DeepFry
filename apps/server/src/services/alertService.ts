import { Kafka, logLevel } from "kafkajs";
import nodemailer from "nodemailer";
import prisma from "../prismaClient";
import { info, warn, error } from "../../utils/logger";
import { kafkaBrokerList } from "../config/kafkaConfig";
import { mailConfig } from "../config/mailConfig";
import { WebSocketServer, WebSocket } from "ws";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

async function connectWithRetry(kafkaClient: Kafka, consumer: any, retries = 0): Promise<boolean> {
  try {
    await consumer.connect();
    info(`Alert service connected to Kafka`);
    return true;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      warn(`Kafka connection failed (attempt ${retries + 1}/${MAX_RETRIES}): ${err}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectWithRetry(kafkaClient, consumer, retries + 1);
    }
    error(`Failed to connect to Kafka after ${MAX_RETRIES} attempts: ${err}`);
    return false;
  }
}

export async function startAlertService(wsServer: WebSocketServer): Promise<void> {
  let kafkaClient: Kafka | null = null;
  let consumer: any = null;

  try {
    kafkaClient = new Kafka({
      clientId: "alert-service",
      brokers: kafkaBrokerList,
      logLevel: logLevel.INFO,
    });
    consumer = kafkaClient.consumer({ groupId: "alert-service" });

    const connected = await connectWithRetry(kafkaClient, consumer);
    if (!connected) {
      warn("Alert service starting without Kafka - alerts will be disabled");
      return;
    }

    // Subscribe to both topics
    const topics = ["validator-votes", "validator-consensus"];
    await Promise.all(topics.map(topic => 
      consumer.subscribe({ topic, fromBeginning: false })
    ));
    info(`Subscribed to topics: ${topics.join(", ")}`);

    const transporter = nodemailer.createTransport({
      host: mailConfig.SMTP_HOST,
      port: mailConfig.SMTP_PORT,
      secure: mailConfig.SMTP_SECURE,
      auth: {
        user: mailConfig.SMTP_USER,
        pass: mailConfig.SMTP_PASS,
      },
    });

    await consumer.run({
      eachMessage: async ({ topic, message }: { topic: string, message: { value: Buffer } }) => {
        try {
          const payload = JSON.parse(message.value!.toString());

         
          if (topic === "validator-votes" && payload.type === "vote") {
            if (payload.status !== "DOWN") return;

               
            const siteRecord = await prisma.website.findUnique({
              where: { url: payload.url },
              select: { user: { select: { email: true } } },
            });
            const userEmail = siteRecord?.user.email;
            if (!userEmail) {
              warn(`No user/email for site '${payload.url}', skipping alerts.`);
              return;
            }

            const subject = `🚨 ALERT: ${payload.url} DOWN in ${payload.location}`;
            const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff4444; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .metric { margin: 10px 0; }
    .metric-label { font-weight: bold; }
    .status-up { color: #00c853; }
    .status-down { color: #ff4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🚨 Site Down Alert</h2>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We've detected that your monitored site is currently down in one of our monitoring regions:</p>
      
      <div class="metric">
        <span class="metric-label">Site URL:</span> ${payload.url}
      </div>
      <div class="metric">
        <span class="metric-label">Status:</span> <span class="status-down">DOWN</span>
      </div>
      <div class="metric">
        <span class="metric-label">Detected At:</span> ${new Date(payload.timestamp).toLocaleString()}
      </div>
      <div class="metric">
        <span class="metric-label">Location:</span> ${payload.location}
      </div>
      <div class="metric">
        <span class="metric-label">Validator ID:</span> ${payload.validatorId}
      </div>

      <h3>Detailed Status</h3>
      <div class="metric">
        <span class="metric-label">ICMP Status:</span> 
        <span class="status-${payload.icmpStatus.toLowerCase()}">${payload.icmpStatus}</span>
        ${payload.icmpLatencyMs > 0 ? `(${payload.icmpLatencyMs}ms)` : ''}
      </div>
      <div class="metric">
        <span class="metric-label">HTTP Status:</span> 
        <span class="status-${payload.httpStatus.toLowerCase()}">${payload.httpStatus}</span>
        ${payload.httpCode ? `(Code: ${payload.httpCode})` : ''}
      </div>
      ${payload.failureReason ? `
      <div class="metric">
        <span class="metric-label">Failure Reason:</span> ${payload.failureReason}
      </div>
      ` : ''}

      <p>Note: This alert is from a single monitoring region (${payload.location}). Other regions may report different statuses.</p>
      <p>Our team is monitoring the situation and will keep you updated.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>The DeepFry Team</p>
      <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`.trim();

            try {
              await transporter.sendMail({
                from: mailConfig.MAIL_FROM,
                to: userEmail,
                subject,
                html,
              });
              info(`Email sent: ${payload.url} @ ${payload.location} → ${userEmail}`);
            } catch (mailErr) {
              error(`Failed to send email: ${mailErr}`);
            }

           
            const wsEvent = {
              type: "VALIDATOR_DOWN",
              data: {
                url: payload.url,
                validatorId: payload.validatorId,
                location: payload.location,
                latencyMs: payload.latencyMs,
                timestamp: payload.timestamp,
                icmpStatus: payload.icmpStatus,
                icmpLatencyMs: payload.icmpLatencyMs,
                httpStatus: payload.httpStatus,
                httpCode: payload.httpCode,
                failureReason: payload.failureReason
              },
            };
            wsServer.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(wsEvent));
              }
            });
            info(`WS broadcast: VALIDATOR_DOWN for ${payload.url} @ ${payload.location}`);
          }
          
         
          else if (topic === "validator-consensus" && payload.type === "consensus") {
            if (payload.consensus !== "DOWN") return;

           
            const siteRecord = await prisma.website.findUnique({
              where: { url: payload.url },
              select: { user: { select: { email: true } } },
            });
            const userEmail = siteRecord?.user.email;
            if (!userEmail) {
              warn(`No user/email for site '${payload.url}', skipping consensus alert.`);
              return;
            }

            const subject = `🚨 CRITICAL: ${payload.url} DOWN ACROSS ALL REGIONS`;
            const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff0000; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .metric { margin: 10px 0; }
    .metric-label { font-weight: bold; }
    .critical { color: #ff0000; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🚨 CRITICAL ALERT</h2>
    </div>
    <div class="content">
      <p class="critical">URGENT: Your site is down across all monitoring regions!</p>
      
      <div class="metric">
        <span class="metric-label">Site URL:</span> ${payload.url}
      </div>
      <div class="metric">
        <span class="metric-label">Status:</span> <span class="critical">DOWN</span>
      </div>
      <div class="metric">
        <span class="metric-label">Detected At:</span> ${new Date(payload.timestamp).toLocaleString()}
      </div>

      <h3>Votes Summary</h3>
      ${payload.votes.map((vote: any) => `
      <div class="metric">
        <span class="metric-label">Region ${vote.location}:</span>
        <span class="critical">DOWN</span>
        (Latency: ${vote.latencyMs}ms)
      </div>
      `).join('')}

      <p class="critical">This is a critical alert indicating that your site is down across all monitoring regions. Immediate action is required.</p>
      <p>Our team has been notified and is investigating the issue.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>The DeepFry Team</p>
      <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`.trim();

            try {
              await transporter.sendMail({
                from: mailConfig.MAIL_FROM,
                to: userEmail,
                subject,
                html,
              });
              info(`Critical consensus email sent: ${payload.url} → ${userEmail}`);
            } catch (mailErr) {
              error(`Failed to send consensus email: ${mailErr}`);
            }

           
            const wsEvent = {
              type: "CRITICAL_CONSENSUS_DOWN",
              data: {
                url: payload.url,
                votes: payload.votes,
                timestamp: payload.timestamp,
              },
            };
            wsServer.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(wsEvent));
              }
            });
            info(`WS broadcast: CRITICAL_CONSENSUS_DOWN for ${payload.url}`);
          }
        } catch (err: any) {
          error(`Error in alertService.eachMessage: ${err.stack || err}`);
        }
      },
    });
  } catch (err: any) {
    error(`Failed to start alert service: ${err.stack || err}`);
   
  }
}


if (require.main === module) {
  error("Please import startAlertService(wsServer) from your main server entrypoint.");
  process.exit(1);
}
