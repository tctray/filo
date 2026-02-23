import React, { createContext, useContext, useMemo, useState } from "react";

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
};

export type AuthUser = { email: string; name?: string };

export type AuthContextValue = {
  user: AuthUser | null;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  guestLogin: () => Promise<void>;

  isLoggingIn: boolean;
  isRegistering: boolean;
  isGuestLoggingIn: boolean;

  loginError: string | null;
  registerError: string | null;

  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGuestLoggingIn, setIsGuestLoggingIn] = useState(false);

  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const login = async ({ email, password }: LoginPayload) => {
    try {
      setIsLoggingIn(true);
      setLoginError(null);

      if (!email?.trim()) throw new Error("Email required");
      if (!password?.trim()) throw new Error("Password required");

      // Fake network delay
      await new Promise((res) => setTimeout(res, 600));

      setUser({ email: email.trim() });
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      setLoginError(msg);
      throw new Error(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const register = async ({ email, password, name }: RegisterPayload) => {
    try {
      setIsRegistering(true);
      setRegisterError(null);

      if (!email?.trim()) throw new Error("Email required");
      if (!password?.trim()) throw new Error("Password required");

      // Fake network delay
      await new Promise((res) => setTimeout(res, 600));

      setUser({ email: email.trim(), name: name?.trim() || undefined });
    } catch (err: any) {
      const msg = err?.message || "Registration failed";
      setRegisterError(msg);
      throw new Error(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  const guestLogin = async () => {
    try {
      setIsGuestLoggingIn(true);
      setLoginError(null);
      setRegisterError(null);

      await new Promise((res) => setTimeout(res, 400));

      setUser({ email: "guest@filo.app", name: "Guest" });
    } catch {
      const msg = "Guest login failed";
      setLoginError(msg);
      throw new Error(msg);
    } finally {
      setIsGuestLoggingIn(false);
    }
  };

  const logout = () => setUser(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
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
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
