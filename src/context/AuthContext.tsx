import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser } from '../api/auth';
import type { User, RegisterPayload } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    try {
      await apiLogin(username, password);
      const u = await getCurrentUser();
      setUser(u);
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: msg };
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      await apiRegister(payload);
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
