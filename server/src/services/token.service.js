import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sha256 } from '../utils/crypto.js';

const parseDurationMs = (duration) => {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
};

export const tokenService = {
  createAccessToken(user) {
    return jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        societyId: user.societyId?.toString() || null,
        flatId: user.flatId?.toString() || null
      },
      env.jwtAccessSecret,
      { expiresIn: env.jwtAccessExpiresIn }
    );
  },

  createRefreshToken(user) {
    return jwt.sign({ sub: user._id.toString(), type: 'refresh' }, env.jwtRefreshSecret, {
      expiresIn: env.jwtRefreshExpiresIn
    });
  },

  verifyAccessToken(token) {
    return jwt.verify(token, env.jwtAccessSecret);
  },

  verifyRefreshToken(token) {
    return jwt.verify(token, env.jwtRefreshSecret);
  },

  refreshTokenExpiresAt() {
    return new Date(Date.now() + parseDurationMs(env.jwtRefreshExpiresIn));
  },

  hashToken(token) {
    return sha256(token);
  },

  cookieOptions() {
    return {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.nodeEnv === 'production' ? 'strict' : 'lax',
      maxAge: parseDurationMs(env.jwtRefreshExpiresIn)
    };
  }
};
