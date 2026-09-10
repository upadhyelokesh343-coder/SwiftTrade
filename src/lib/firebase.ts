import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBs-K-njGeQeBo_6L3Yb7jXwzeHDABYTjc",
  authDomain: "totemic-hexagon-3pp0d.firebaseapp.com",
  projectId: "totemic-hexagon-3pp0d",
  storageBucket: "totemic-hexagon-3pp0d.firebasestorage.app",
  messagingSenderId: "858895100",
  appId: "1:858895100:web:e94ac874eb9caec9339d79"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = !getApps().length ? initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, "ai-studio-gurutradesimulat-5810d7b2-abe7-4375-8b5d-8ec77a789317") : getFirestore(app, "ai-studio-gurutradesimulat-5810d7b2-abe7-4375-8b5d-8ec77a789317");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export default app;
