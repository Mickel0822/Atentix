"use client";

import { useState, useEffect } from "react";
import { createClientSupabase } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UseCurrentUserReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para obtener el usuario actual de Supabase
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClientSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      setUser(session?.user ?? null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al obtener usuario";
      setError(errorMessage);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    // Escuchar cambios en la autenticación
    const supabase = createClientSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    error,
    refresh,
  };
}
