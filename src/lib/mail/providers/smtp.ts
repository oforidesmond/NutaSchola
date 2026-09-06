import nodemailer from "nodemailer";
import { logger } from "@/lib/errors/logger";
import type { OutboundEmail } from "@/lib/mail/types";

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

export function canUseSmtp(): boolean {
  const provider = (process.env.EMAIL_PROVIDER ?? "smtp").toLowerCase();
  return provider === "smtp" && smtpConfigured();
}

function fromAddress(): string {
  const address = process.env.EMAIL_FROM_ADDRESS?.trim() || process.env.SMTP_USER!.trim();
  const name = process.env.EMAIL_FROM_NAME?.trim();
  return name ? `${name} <${address}>` : address;
}

export async function sendViaSmtp(message: OutboundEmail): Promise<void> {
  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    (!process.env.SMTP_SECURE && port === 465);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  await transporter.sendMail({
    from: fromAddress(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  logger.info("mail.smtp_sent", {
    to: message.to,
    subject: message.subject,
  });
}
