"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface PrivacyContextType {
  hidden: boolean;
  toggle: () => void;
  mask: (value: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType>({
  hidden: false,
  toggle: () => {},
  mask: (v) => v,
});

const MASK = "••••";
const STORAGE_KEY = "wealth-hide-values";

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setHidden(true);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setHidden((h) => {
      const next = !h;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const mask = useCallback(
    (value: string) => (hidden ? MASK : value),
    [hidden]
  );

  return (
    <PrivacyContext.Provider value={{ hidden, toggle, mask }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
