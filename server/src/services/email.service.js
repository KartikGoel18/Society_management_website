import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const createTransporter = () => {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  });
};

export const emailService = {
  async sendMail({ to, subject, text, html }) {
    const transporter = createTransporter();

    if (!transporter) {
      throw new ApiError(503, 'SMTP is not configured');
    }

    return transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html
    });
  }
};
