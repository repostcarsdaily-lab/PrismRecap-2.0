import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'prismrecap-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'prismrecap-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'prismrecap-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:demo',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
export const db = getFirestore(app);

export const FIRESTORE_COLLECTIONS = {
  users: 'users',
  meetings: 'meetings',
  tasks: 'tasks',
  departments: 'departments',
  messages: 'messages',
  notifications: 'notifications',
  emailHistory: 'emailHistory',
  meetingHistory: 'meetingHistory',
};

export async function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  return signOut(auth);
}

export async function resetPasswordForEmail(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function sendVerificationEmail(user) {
  return sendEmailVerification(user);
}

export async function createUserProfile(profile) {
  const userRef = doc(db, FIRESTORE_COLLECTIONS.users, profile.uid);
  await setDoc(userRef, { ...profile, createdAt: serverTimestamp() }, { merge: true });
}

export async function getUserProfile(uid) {
  const userRef = doc(db, FIRESTORE_COLLECTIONS.users, uid);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function updateUserProfile(data) {
  if (!auth.currentUser) return;
  const userRef = doc(db, FIRESTORE_COLLECTIONS.users, auth.currentUser.uid);
  await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
}

export async function createNotification({ title, message, type = 'System', userId, ...data }) {
  const ref = await addDoc(collection(db, FIRESTORE_COLLECTIONS.notifications), {
    title,
    message,
    type,
    read: false,
    userId: userId || auth.currentUser?.uid || 'guest',
    createdAt: new Date().toISOString(),
    ...data,
  });
  return ref.id;
}

export async function createCollectionItem(collectionName, data) {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createNamedCollectionItem(collectionName, id, data) {
  const ref = doc(db, collectionName, id);
  await setDoc(ref, { ...data, id, createdAt: serverTimestamp() }, { merge: true });
  return id;
}
