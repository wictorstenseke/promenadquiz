import { createContext, useContext, useEffect, useState } from "react";
import { onAuthChange, signOut as authSignOut, type AuthUser } from "../auth";
import { storage } from "../storage";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthChange((u) => {
        setUser(u);
        setLoading(false);
        // Claim any unowned local walks for this account so they cross devices.
        if (u) void storage.adoptLocalWalks(u.uid);
      }),
    [],
  );

  return (
    <AuthContext.Provider value={{ user, loading, signOut: authSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
