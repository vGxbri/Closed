import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { authService } from "../services/auth.service";
import { Profile } from "../types/database";

interface AuthContextType {
  // State
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Initialize auth state via onAuthStateChange (single source of truth)
  useEffect(() => {
    // Subscribe to auth changes - this handles INITIAL_SESSION automatically
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Load profile in background, don't block auth state
        loadProfile(newSession.user);
      } else {
        setProfile(null);
      }

      // Mark loading as complete after first event (INITIAL_SESSION or SIGNED_OUT)
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (fallbackUser?: User | null) => {
    try {
      setIsProfileLoading(true);
      let currentProfile = await authService.getCurrentProfile();

      const targetUser = fallbackUser ?? user;

      // Retry mechanism for new registrations (race condition with trigger)
      if (!currentProfile && targetUser) {
        for (let i = 0; i < 3; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          currentProfile = await authService.getCurrentProfile();
          if (currentProfile) break;
        }
      }

      setProfile(currentProfile);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { session: newSession } = await authService.signIn({
      email,
      password,
    });
    setSession(newSession);
    setUser(newSession?.user ?? null);
    if (newSession?.user) {
      await loadProfile(newSession.user);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    const { session: newSession } = await authService.signUp({
      email,
      password,
      displayName,
    });
    setSession(newSession);
    setUser(newSession?.user ?? null);
    // Profile is created automatically by database trigger
    if (newSession?.user) {
      // Small delay for trigger to complete
      setTimeout(() => loadProfile(newSession.user), 1000);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore error if not logged in with Google
    }
    await authService.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      setIsProfileLoading(true);
      const updatedProfile = await authService.updateProfile(updates);
      setProfile(updatedProfile);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    isLoading,
    isProfileLoading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Utility hook for requiring authentication
export function useRequireAuth() {
  const auth = useAuth();

  if (!auth.isLoading && !auth.isAuthenticated) {
    // Could redirect to login here
    // router.replace('/auth/login');
  }

  return auth;
}
