import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";

/**
 * Firebase config is read from Vite env vars (VITE_FIREBASE_*). These are web
 * client keys — safe to ship in the bundle; access is governed by Firestore
 * rules, not by hiding the key.
 *
 * When the vars are absent (e.g. local dev with no project, or a fork without
 * secrets) we leave Firebase uninitialised and the app falls back to a pure
 * localStorage backend. Nothing crashes; cross-device sharing is simply off.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | undefined;
let firestore: Firestore | undefined;
let authInstance: Auth | undefined;

if (firebaseEnabled) {
  app = initializeApp(config);
  // On mobile networks / proxies the default WebChannel stream often fails and
  // the SDK stalls ~10-15s before falling back to long-polling — which showed
  // up as a very slow submit. Auto-detect long-polling so it switches up front.
  firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
  authInstance = getAuth(app);
}

/** Firestore instance, or null when no config is present. */
export const db: Firestore | null = firestore ?? null;

/** Firebase Auth instance, or null when no config is present. */
export const auth: Auth | null = authInstance ?? null;
