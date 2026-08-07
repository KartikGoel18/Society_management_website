import axios from 'axios';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const smsService = {
  async sendOtp(phone, otp) {
    if (env.nodeEnv === 'test') {
      return { type: 'success', phone, otp };
    }

    if (!env.msg91.authKey || !env.msg91.templateId) {
      throw new ApiError(503, 'MSG91 is not configured');
    }

    const payload = {
      template_id: env.msg91.templateId,
      mobile: phone.replace(/^\+/, ''),
      authkey: env.msg91.authKey,
      otp
    };

    const response = await axios.post(`${env.msg91.baseUrl}/otp`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  },

  async verifyOtp(phone, otp) {
    if (env.nodeEnv === 'test') {
      return { type: 'success', phone, otp };
    }

    if (!env.msg91.authKey) {
      throw new ApiError(503, 'MSG91 is not configured');
    }

    const response = await axios.get(`${env.msg91.baseUrl}/otp/verify`, {
      params: {
        authkey: env.msg91.authKey,
        mobile: phone.replace(/^\+/, ''),
        otp
      }
    });

    return response.data;
  }
};
