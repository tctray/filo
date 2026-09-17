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
export type AuthUser = { id: string; email: string; name?: string };

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
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGuestLoggingIn, setIsGuestLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // ── Restore session on mount ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s?.user) {
        setUser({
          id: s.user.id,
          email: s.user.email ?? "",
          name: s.user.user_metadata?.name,
        });
      }
      setIsReady(true);
    });

    // Keep in sync with Supabase auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
            name: session.user.user_metadata?.name,
          });
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
