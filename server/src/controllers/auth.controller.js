import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { auditService } from '../services/audit.service.js';
import { smsService } from '../services/sms.service.js';
import { tokenService } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sha256 } from '../utils/crypto.js';
import { generateOtp } from '../utils/generateOtp.js';
import { sendSuccess } from '../utils/apiResponse.js';

const attachRefreshToken = async (res, user) => {
  const refreshToken = tokenService.createRefreshToken(user);
  user.refreshTokens.push({
    tokenHash: tokenService.hashToken(refreshToken),
    expiresAt: tokenService.refreshTokenExpiresAt()
  });
  await user.save();
  res.cookie('refreshToken', refreshToken, tokenService.cookieOptions());
};

const authPayload = (user) => ({
  user,
  accessToken: tokenService.createAccessToken(user)
});

export const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const otp = generateOtp();
  const otpHash = sha256(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  let user = await User.findOne({ phone }).select('+passwordHash');
  if (!user) {
    user = new User({ name: 'Pending User', phone });
  }

  user.otp = {
    codeHash: otpHash,
    expiresAt,
    attempts: 0,
    lastSentAt: new Date()
  };
  await user.save();

  await smsService.sendOtp(phone, otp);
  sendSuccess(res, 200, { expiresAt }, 'OTP sent');
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const user = await User.findOne({ phone });

  if (!user || !user.otp?.codeHash || user.otp.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP is invalid or expired');
  }

  user.otp.attempts += 1;

  if (user.otp.attempts > 5) {
    await user.save();
    throw new ApiError(429, 'Too many OTP attempts');
  }

  const providerResult = await smsService.verifyOtp(phone, otp);
  const localMatch = user.otp.codeHash === sha256(otp);

  if (!localMatch && String(providerResult.type || providerResult.message).toLowerCase() !== 'success') {
    await user.save();
    throw new ApiError(400, 'OTP verification failed');
  }

  user.isVerified = true;
  user.otp = undefined;
  await user.save();

  sendSuccess(res, 200, { user }, 'OTP verified');
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = ROLES.RESIDENT, societyId, flatId } = req.body;

  if (role !== ROLES.RESIDENT) {
    throw new ApiError(403, 'Public registration is only available for residents');
  }

  const existingUser = await User.findOne({ phone }).select('+passwordHash');

  if (existingUser?.passwordHash) {
    throw new ApiError(409, 'A user with this phone already exists');
  }

  const user = existingUser || new User({ phone });
  user.name = name;
  user.email = email;
  user.role = role;
  user.societyId = societyId || user.societyId;
  user.flatId = flatId || user.flatId;
  user.isApproved = role === ROLES.SUPER_ADMIN;
  await user.setPassword(password);
  await user.save();

  await attachRefreshToken(res, user);
  sendSuccess(res, 201, authPayload(user), 'Registration successful');
});

export const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const user = await User.findOne({ phone }).select('+passwordHash');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid phone or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'User account is inactive');
  }

  await attachRefreshToken(res, user);
  sendSuccess(res, 200, authPayload(user), 'Login successful');
});

export const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenValue = req.cookies.refreshToken;

  if (!refreshTokenValue) {
    throw new ApiError(401, 'Refresh token required');
  }

  const payload = tokenService.verifyRefreshToken(refreshTokenValue);
  const tokenHash = tokenService.hashToken(refreshTokenValue);
  const user = await User.findOne({
    _id: payload.sub,
    'refreshTokens.tokenHash': tokenHash,
    'refreshTokens.expiresAt': { $gt: new Date() }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  sendSuccess(res, 200, authPayload(user), 'Token refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  const refreshTokenValue = req.cookies.refreshToken;

  if (refreshTokenValue) {
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { refreshTokens: { tokenHash: tokenService.hashToken(refreshTokenValue) } } }
    );
  }

  res.clearCookie('refreshToken', tokenService.cookieOptions());
  sendSuccess(res, 200, null, 'Logged out');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });

  if (!user) {
    sendSuccess(res, 200, null, 'If the phone is registered, a reset OTP will be sent');
    return;
  }

  const otp = generateOtp();
  user.passwordReset = {
    codeHash: sha256(otp),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    lastSentAt: new Date()
  };
  await user.save();
  await smsService.sendOtp(phone, otp);
  await auditService.record({ req, action: 'password_reset_requested', entityType: 'User', entityId: user._id });

  sendSuccess(res, 200, null, 'If the phone is registered, a reset OTP will be sent');
});
