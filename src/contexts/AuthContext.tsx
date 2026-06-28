import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "company" | "candidate" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: "company" | "candidate", companyName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutId!);
    }
  };

  const clearStoredAuthSession = () => {
    try {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
        .forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
      console.warn("Unable to clear stale auth session:", error);
    }
  };

  const fetchRole = async (userId: string): Promise<UserRole> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.role as UserRole) ?? null;
  };

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    let currentUserId: string | null = null;

    const loadUserRole = (userId: string, showLoading = false) => {
      if (showLoading) setLoading(true);
      window.setTimeout(() => {
        withTimeout(fetchRole(userId), 5000, "Role lookup timed out")
          .then((nextRole) => {
            if (mounted) setRole(nextRole);
          })
          .catch((error) => {
            console.error("Failed to fetch role:", error);
            if (mounted) setRole(null);
          })
          .finally(() => {
            if (mounted && showLoading) setLoading(false);
          });
      }, 0);
    };

    const subscribeToAuthChanges = () => {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;

        const nextUserId = nextSession?.user?.id ?? null;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        // Only reload role when the user actually changes. Ignore TOKEN_REFRESHED
        // and tab-focus events that fire with the same user — otherwise the app
        // re-renders into a loading spinner and resets form state.
        if (nextUserId && nextUserId !== currentUserId) {
          currentUserId = nextUserId;
          loadUserRole(nextUserId, false);
        } else if (!nextUserId && currentUserId) {
          currentUserId = null;
          setRole(null);
        }
      });
      subscription = data.subscription;
    };

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          "Auth session timed out"
        );

        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const nextRole = await withTimeout(fetchRole(initialSession.user.id), 5000, "Role lookup timed out");
          if (mounted) setRole(nextRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        clearStoredAuthSession();
        if (mounted) {
          setSession(null);
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          subscribeToAuthChanges();
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: "company" | "candidate", companyName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from("user_roles").insert({ user_id: data.user.id, role });
      if (companyName) {
        await supabase.from("profiles").update({ company_name: companyName }).eq("user_id", data.user.id);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
