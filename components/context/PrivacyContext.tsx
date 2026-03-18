"use client";

import { createContext, useContext, useState, useCallback } from "react";

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

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  const toggle = useCallback(() => {
    setHidden((h) => !h);
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
