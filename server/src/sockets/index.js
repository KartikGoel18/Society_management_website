import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { tokenService } from '../services/token.service.js';
import { logger } from '../utils/logger.js';

let io;

export const registerSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl.split(',').map((origin) => origin.trim()),
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }

      socket.auth = tokenService.verifyAccessToken(token);
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    const { societyId, sub } = socket.auth;
    socket.join(`user:${sub}`);
    if (societyId) socket.join(`society:${societyId}`);
    logger.info({ socketId: socket.id, userId: sub }, 'Socket connected');
  });

  return io;
};

export const getIo = () => io;
