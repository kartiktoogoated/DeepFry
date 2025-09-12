import { Kafka } from 'kafkajs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const kafka = new Kafka({
  clientId: 'otp-service',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS!], 
});

const consumer = kafka.consumer({ groupId: 'otp-service-group' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOTPEmail(email: string, otp: string) {
  await transporter.sendMail({
    from: `"OTP Service" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your OTP Code',
    html: `<p>Your OTP is <strong>${otp}</strong></p>`,
  });
  console.log(`✅ Email sent to ${email}`);
}

async function runConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'otp-requests', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const { email, otp } = JSON.parse(message.value!.toString());
        if (!email || !otp) throw new Error('Missing email or OTP in message');
        console.log(`Sending OTP to ${email}`);
        await sendOTPEmail(email, otp);
      } catch (err) {
        console.error('❌ Failed to handle message:', err);
      }
    },
  });
}

runConsumer().catch(console.error);
