import { ImageResponse } from "next/og";
import { routing } from "@/i18n";

export const runtime = "edge";
export const alt = "wealth.Investing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return [{ id: params.locale, alt, size, contentType }];
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const COPY: Record<string, { headline: string; sub: string; cta: string }> = {
  pt: {
    headline: "Pare de operar no escuro.",
    sub: "Journal, macro e IA que lê seu histórico.",
    cta: "wealth.Investing",
  },
  en: {
    headline: "Stop trading in the dark.",
    sub: "Journal, macro, and AI that reads your history.",
    cta: "wealth.Investing",
  },
};

export default async function OpengraphImage({ params }: { params: { locale: string } }) {
  const copy = COPY[params.locale] ?? COPY.pt;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(ellipse at top left, #1a1a1a 0%, #0a0a0a 100%)",
          color: "white",
          padding: "80px 72px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#f59e0b",
            display: "flex",
          }}
        >
          {copy.cta}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 960,
            }}
          >
            {copy.headline}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.75)",
              maxWidth: 880,
            }}
          >
            {copy.sub}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span>owealthinvesting.com</span>
          <span style={{ fontVariant: "all-small-caps" }}>
            {params.locale.toUpperCase()}
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
