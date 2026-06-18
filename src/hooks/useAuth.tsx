import { createContext, useContext, useEffect, useRef, useState } from "react";
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
  // onAuthChange fires on initial restore AND on token refreshes; adopt only
  // once per uid so we don't re-issue cloud writes on every callback.
  const adoptedUid = useRef<string | null>(null);

  useEffect(
    () =>
      onAuthChange((u) => {
        setUser(u);
        setLoading(false);
        if (u && adoptedUid.current !== u.uid) {
          adoptedUid.current = u.uid;
          // Claim any unowned local walks for this account so they cross devices.
          void storage.adoptLocalWalks(u.uid);
        }
        if (!u) adoptedUid.current = null;
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
