import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (name: string, phone: string, password: string) => Promise<void>;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authApi.getToken();
    if (token) {
      authApi
        .getMe()
        .then((u) => setUser(u))
        .catch(() => {
          authApi.removeToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signUp = async (name: string, phone: string, password: string) => {
    const res = await authApi.register(name, phone, password);
    setUser(res.user);
  };

  const signIn = async (phone: string, password: string) => {
    const res = await authApi.login(phone, password);
    setUser(res.user);
  };

  const signOut = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
