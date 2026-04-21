import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand — wealth.Investing",
  description: "Internal dogfood page for brand primitives.",
  robots: { index: false, follow: false },
};

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
