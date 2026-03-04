import { AuthGate } from "@/components/auth/AuthGate";
import { BootstrapWarning } from "@/components/auth/BootstrapWarning";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <BootstrapWarning />
        {children}
      </div>
    </AuthGate>
  );
}
