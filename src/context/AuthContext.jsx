import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  createUserProfile,
  getUserProfile,
  resetPasswordForEmail,
  sendVerificationEmail,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
  updateUserProfile,
} from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileData = await getUserProfile(currentUser.uid);
          setProfile(profileData);
        } catch (err) {
          setError(err.message || 'Unable to load profile');
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async ({ email, password, name, department, role }) => {
    setError('');
    try {
      const credential = await signUpWithEmail(email, password);
      const userProfile = {
        uid: credential.user.uid,
        name,
        email,
        department,
        role,
        avatar: '',
        emailVerified: false,
      };
      await createUserProfile(userProfile);
      await updateUserProfile({ name, department, role, avatar: '' });
      setProfile(userProfile);
      return credential;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const login = async (email, password) => {
    setError('');
    try {
      return await signInWithEmail(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    setError('');
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
    } catch (err) {
      setError(err.message || 'Logout failed');
      throw err;
    }
  };

  const resetPassword = async (email) => {
    setError('');
    try {
      await resetPasswordForEmail(email);
    } catch (err) {
      setError(err.message || 'Password reset failed');
      throw err;
    }
  };

  const verifyEmail = async () => {
    if (!auth.currentUser) return;
    try {
      await sendVerificationEmail(auth.currentUser);
    } catch (err) {
      setError(err.message || 'Unable to send verification');
      throw err;
    }
  };

  const value = useMemo(
    () => ({ user, profile, loading, error, signup, login, logout, resetPassword, verifyEmail }),
    [user, profile, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
