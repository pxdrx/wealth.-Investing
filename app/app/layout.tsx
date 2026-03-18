import { AuthGate } from "@/components/auth/AuthGate";
import { BootstrapWarning } from "@/components/auth/BootstrapWarning";
import { PrivacyProvider } from "@/components/context/PrivacyContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <PrivacyProvider>
        <div className="min-h-screen">
          <BootstrapWarning />
          {children}
        </div>
      </PrivacyProvider>
    </AuthGate>
  );
}
