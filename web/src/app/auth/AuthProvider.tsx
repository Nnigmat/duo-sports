import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '../../../../shared/types';
import { apiLogout, fetchMe } from './authApi';

type AuthState =
  | { status: 'loading' }
  | { status: 'out' }
  | { status: 'in'; user: AuthUser };

type Ctx = AuthState & {
  signedIn: (user: AuthUser) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const user = await fetchMe();
      setState(user ? { status: 'in', user } : { status: 'out' });
    } catch {
      setState({ status: 'out' });
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      refresh,
      signedIn: (user) => setState({ status: 'in', user }),
      signOut: async () => {
        await apiLogout();
        setState({ status: 'out' });
      },
    }),
    [state, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
