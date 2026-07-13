import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { getHasPasscodeKey } from "../utils/passcodeConstants";

type AuthContextValue = {
  session: Session | null;
  hasPasscode: boolean;
  isUnlocked: boolean;
  loading: boolean;
  unlock: () => void;
  lock: () => void;
  refreshPasscodeFlag: (userId?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Checks the passcode flag scoped to WHOEVER is currently signed in —
  // pass a userId explicitly rather than reading from state, since state
  // updates are async and this is often called right after a session
  // change, before `session` in state has necessarily updated yet.
  const refreshPasscodeFlag = useCallback(async (userId?: string) => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const uid = userId ?? currentSession?.user?.id;

    if (!uid) {
      setHasPasscode(false);
      return;
    }

    const flag = await SecureStore.getItemAsync(getHasPasscodeKey(uid));
    setHasPasscode(flag === "true");
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      await refreshPasscodeFlag(currentSession?.user?.id);
      setLoading(false);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setIsUnlocked(false); // signed out -> re-lock
        setHasPasscode(false);
      } else {
        refreshPasscodeFlag(newSession.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [refreshPasscodeFlag]);

  const unlock = useCallback(() => setIsUnlocked(true), []);
  const lock = useCallback(() => setIsUnlocked(false), []);

  return (
    <AuthContext.Provider
      value={{ session, hasPasscode, isUnlocked, loading, unlock, lock, refreshPasscodeFlag }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}