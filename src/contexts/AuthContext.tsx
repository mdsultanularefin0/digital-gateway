import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { setUserIdentifiers, clearUserIdentifiers } from "@/lib/meta-pixel";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const checkAdmin = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const user = newSession.user;
          const fullName = user.user_metadata?.display_name || user.user_metadata?.full_name || "";
          const phone = user.phone || user.user_metadata?.phone || "";
          const parts = fullName.trim().split(/\s+/);

          setUserIdentifiers({ 
            email: user.email,
            phone: phone,
            firstName: parts[0],
            lastName: parts.length > 1 ? parts[parts.length - 1] : undefined
          });

          setTimeout(async () => {
            await checkAdmin(user.id);
            setLoading(false);
          }, 0);
        } else {
          clearUserIdentifiers();
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // THEN check initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!initialized.current) {
        initialized.current = true;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          const user = initialSession.user;
          const fullName = user.user_metadata?.display_name || user.user_metadata?.full_name || "";
          const phone = user.phone || user.user_metadata?.phone || "";
          const parts = fullName.trim().split(/\s+/);
          
          setUserIdentifiers({ 
            email: user.email,
            phone: phone,
            firstName: parts[0],
            lastName: parts.length > 1 ? parts[parts.length - 1] : undefined
          });
          await checkAdmin(user.id);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
