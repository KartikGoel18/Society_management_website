import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new ApiError(422, 'Unsupported file type'));
      return;
    }

    callback(null, true);
  }
});
