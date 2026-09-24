// providers/AuthProvider.tsx
import { supabase } from "@/lib/supabase";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
};
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string | null;
};

export type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean; // true once session check is complete

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  guestLogin: () => Promise<void>;

  isLoggingIn: boolean;
  isRegistering: boolean;
  isGuestLoggingIn: boolean;

  loginError: string | null;
  registerError: string | null;

  logout: () => Promise<void>;

  /**
   * Re-fetches the current user's profile (including avatar_url) from
   * Supabase and updates the shared user object. Call this after any
   * screen updates the profile (e.g. after uploading a new avatar) so
   * every screen reading `user` picks up the change immediately,
   * without needing a full app reload.
   */
  refreshProfile: () => Promise<void>;

  /** Changes the logged-in user's email. Supabase emails a confirmation
   * link to the new address; the change isn't final until it's clicked. */
  updateEmail: (newEmail: string) => Promise<void>;

  /** Changes the logged-in user's password immediately. */
  updatePassword: (newPassword: string) => Promise<void>;

  /** Sends a password-reset email with a link back to `redirectTo`. */
  sendPasswordReset: (email: string, redirectTo: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAvatarUrl(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data.avatar_url ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGuestLoggingIn, setIsGuestLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const buildUser = async (sUser: {
    id: string;
    email?: string | null;
    user_metadata?: any;
  }): Promise<AuthUser> => {
    const avatar_url = await fetchAvatarUrl(sUser.id);
    return {
      id: sUser.id,
      email: sUser.email ?? "",
      name: sUser.user_metadata?.name,
      avatar_url,
    };
  };

  // ── Restore session on mount ──
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      if (s?.user) {
        setUser(await buildUser(s.user));
      }
      setIsReady(true);
    });

    // Keep in sync with Supabase auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(await buildUser(session.user));
        } else {
          setUser(null);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Login ──
  const login = async ({ email, password }: LoginPayload) => {
    try {
      setIsLoggingIn(true);
      setLoginError(null);

      if (!email?.trim()) throw new Error("Email required");
      if (!password?.trim()) throw new Error("Password required");

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw new Error(error.message);
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      setLoginError(msg);
      throw new Error(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ── Register ──
  const register = async ({ email, password, name }: RegisterPayload) => {
    try {
      setIsRegistering(true);
      setRegisterError(null);

      if (!email?.trim()) throw new Error("Email required");
      if (!password?.trim()) throw new Error("Password required");

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: { data: { name: name?.trim() } },
      });

      if (error) throw new Error(error.message);
    } catch (err: any) {
      const msg = err?.message || "Registration failed";
      setRegisterError(msg);
      throw new Error(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  // ── Guest login (anonymous Supabase session) ──
  const guestLogin = async () => {
    try {
      setIsGuestLoggingIn(true);
      setLoginError(null);
      setRegisterError(null);

      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw new Error(error.message);
    } catch (err: any) {
      const msg = err?.message || "Guest login failed";
      setLoginError(msg);
      throw new Error(msg);
    } finally {
      setIsGuestLoggingIn(false);
    }
  };

  // ── Logout ──
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // ── Refresh profile (call after updating avatar, name, etc.) ──
  const refreshProfile = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUser(await buildUser(data.user));
    }
  };

  // ── Change email (while logged in) ──
  // Supabase sends a confirmation link to the NEW address; the email
  // doesn't actually change until that link is clicked.
  const updateEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw new Error(error.message);
  };

  // ── Change password (while logged in) ──
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw new Error(error.message);
  };

  // ── Forgot password — sends a reset link to the given email ──
  const sendPasswordReset = async (email: string, redirectTo: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw new Error(error.message);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      login,
      register,
      guestLogin,
      isLoggingIn,
      isRegistering,
      isGuestLoggingIn,
      loginError,
      registerError,
      logout,
      refreshProfile,
      updateEmail,
      updatePassword,
      sendPasswordReset,
    }),
    [
      user,
      isReady,
      isLoggingIn,
      isRegistering,
      isGuestLoggingIn,
      loginError,
      registerError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
