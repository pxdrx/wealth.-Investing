import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academy — wealth.Investing",
  description:
    "Aprenda a operar com consistência. Cursos, tutoriais e conteúdos exclusivos para traders que buscam evolução baseada em dados.",
};

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
