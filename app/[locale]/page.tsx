import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingSummary } from "@/components/landing/PricingSummary";
import { getCommunityStats } from "@/lib/community-stats";

export const revalidate = 3600;

export default async function LandingPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const stats = await getCommunityStats();

  return (
    <>
      <Hero socialProof={<SocialProof {...stats} />} />
      <BentoFeatures />
      <HowItWorks />
      <PricingSummary />
      {/* TODO(B-07): <Testimonials /> */}
      {/* TODO(B-08): <FAQ /> */}
      {/* TODO(B-13): <ExitIntentModal /> + <StickyMobileCta /> */}
    </>
  );
}
