import { firebaseAdmin, isFirebaseConfigured } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';

export const pushService = {
  async sendToTokens(tokens, notification, data = {}) {
    if (!isFirebaseConfigured) {
      throw new ApiError(503, 'Firebase FCM is not configured');
    }

    if (!tokens.length) {
      return { successCount: 0, failureCount: 0 };
    }

    return firebaseAdmin.messaging().sendEachForMulticast({
      tokens,
      notification,
      data
    });
  }
};
