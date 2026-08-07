import admin from 'firebase-admin';
import { env } from './env.js';

const hasFirebaseConfig = env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey;

if (hasFirebaseConfig && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey.replace(/\\n/g, '\n')
    })
  });
}

export const firebaseAdmin = admin;
export const isFirebaseConfigured = Boolean(hasFirebaseConfig);
