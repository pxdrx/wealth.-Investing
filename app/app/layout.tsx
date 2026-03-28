import { AuthGate } from "@/components/auth/AuthGate";
import { BootstrapWarning } from "@/components/auth/BootstrapWarning";
import { PrivacyProvider } from "@/components/context/PrivacyContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <PrivacyProvider>
        <div className="min-h-screen">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:text-foreground focus:ring-2 focus:ring-ring"
          >
            Pular para o conteúdo
          </a>
          <BootstrapWarning />
          <main id="main-content">
            {children}
          </main>
        </div>
      </PrivacyProvider>
    </AuthGate>
  );
}
