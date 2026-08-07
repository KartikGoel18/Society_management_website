import { Notification } from '../models/Notification.js';
import { pushService } from './push.service.js';

export const notificationService = {
  async create({ userId, type, title, body, relatedEntityId }) {
    return Notification.create({ userId, type, title, body, relatedEntityId });
  },

  async pushToUser(user, { title, body }, data = {}) {
    if (!user.fcmTokens?.length) {
      return null;
    }

    return pushService.sendToTokens(user.fcmTokens, { title, body }, data);
  }
};
