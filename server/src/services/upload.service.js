import { cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const uploadService = {
  async upload(filePath, options = {}) {
    if (!env.cloudinary.cloudName) {
      throw new ApiError(503, 'Cloudinary is not configured');
    }

    return cloudinary.uploader.upload(filePath, {
      folder: 'society-management',
      resource_type: 'auto',
      ...options
    });
  }
};
