import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  sendOtp,
  verifyOtp
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  forgotPasswordValidator,
  loginValidator,
  registerValidator,
  sendOtpValidator,
  verifyOtpValidator
} from '../validators/auth.validators.js';

export const authRoutes = Router();

authRoutes.post('/send-otp', sendOtpValidator, validate, sendOtp);
authRoutes.post('/verify-otp', verifyOtpValidator, validate, verifyOtp);
authRoutes.post('/register', registerValidator, validate, register);
authRoutes.post('/login', loginValidator, validate, login);
authRoutes.post('/refresh-token', refreshToken);
authRoutes.post('/forgot-password', forgotPasswordValidator, validate, forgotPassword);
authRoutes.post('/logout', authMiddleware, logout);
