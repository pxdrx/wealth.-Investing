import { AuthGate } from "@/components/auth/AuthGate";
import { BootstrapWarning } from "@/components/auth/BootstrapWarning";
import { ParticlesBackground } from "@/components/ui/particles-background";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen">
        <ParticlesBackground />
        <BootstrapWarning />
        <div className="relative z-[1]">
          {children}
        </div>
      </div>
    </AuthGate>
  );
}
