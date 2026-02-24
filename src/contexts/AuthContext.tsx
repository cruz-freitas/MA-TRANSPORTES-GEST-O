import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type UserRole = "admin" | "motorista" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  empresaId: string | null;
  motoristaId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role, empresa_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData) {
      setRole(roleData.role);
      setEmpresaId(roleData.empresa_id);
    }

    if (roleData?.role === "motorista") {
      const { data: motorista } = await supabase
        .from("motoristas")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (motorista) setMotoristaId(motorista.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setEmpresaId(null);
          setMotoristaId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setEmpresaId(null);
    setMotoristaId(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, empresaId, motoristaId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
