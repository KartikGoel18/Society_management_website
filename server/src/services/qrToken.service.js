import crypto from 'crypto';
import { sha256 } from '../utils/crypto.js';

export const qrTokenService = {
  createToken() {
    const token = crypto.randomBytes(32).toString('base64url');
    return {
      token,
      tokenHash: sha256(token)
    };
  },

  hash(token) {
    return sha256(token);
  },

  encodePayload(entityType, entityId, token) {
    return JSON.stringify({ entityType, entityId: entityId.toString(), token });
  },

  decodePayload(payload) {
    return JSON.parse(payload);
  }
};
