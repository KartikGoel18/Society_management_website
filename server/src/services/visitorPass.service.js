import crypto from 'crypto';
import { sha256 } from '../utils/crypto.js';
import { generateOtp } from '../utils/generateOtp.js';

export const visitorPassService = {
  createPass() {
    const otp = generateOtp();
    const qrToken = crypto.randomBytes(32).toString('base64url');

    return {
      otp,
      otpHash: sha256(otp),
      qrToken,
      qrTokenHash: sha256(qrToken)
    };
  },

  hash(value) {
    return sha256(value);
  },

  encodeQrPayload(visitorId, qrToken) {
    return JSON.stringify({ visitorId: visitorId.toString(), token: qrToken });
  },

  decodeQrPayload(qrPayload) {
    const parsed = JSON.parse(qrPayload);
    return {
      visitorId: parsed.visitorId,
      token: parsed.token
    };
  }
};
