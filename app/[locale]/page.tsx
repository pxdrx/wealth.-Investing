import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/landing/Hero";

export const revalidate = 3600;

export default function LandingPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);

  return (
    <>
      <Hero />
      {/* TODO(B-03): <SocialProof /> */}
      {/* TODO(B-04): <BentoFeatures /> */}
      {/* TODO(B-05): <HowItWorks /> */}
      {/* TODO(B-06): <Pricing /> */}
      {/* TODO(B-07): <Testimonials /> */}
      {/* TODO(B-08): <FAQ /> */}
      {/* TODO(B-13): <ExitIntentModal /> + <StickyMobileCta /> */}
    </>
  );
}
