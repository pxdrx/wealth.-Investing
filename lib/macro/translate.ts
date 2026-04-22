import Anthropic from "@anthropic-ai/sdk";
import type { MacroHeadline } from "./types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/**
 * Translate headlines to PT-BR using Claude Haiku.
 * Returns originals on failure (graceful degradation).
 */
export async function translateHeadlines(
  headlines: MacroHeadline[]
): Promise<MacroHeadline[]> {
  if (headlines.length === 0) return headlines;

  // Skip if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[translate] No ANTHROPIC_API_KEY, skipping translation");
    return headlines;
  }

  try {
    const textsToTranslate = headlines.map((h) => h.headline);

    const response = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: `Voce e um tradutor financeiro. Traduza as manchetes para PT-BR.
Mantenha termos tecnicos em ingles: Fed, FOMC, CPI, NFP, PPI, GDP, PMI, ISM, ECB, BoJ, BoE, S&P, Nasdaq, Dow, VIX, etc.
Mantenha nomes proprios, tickers e siglas.
Responda APENAS com um JSON array de strings traduzidas, na mesma ordem.
Se uma manchete ja estiver em portugues, mantenha-a como esta.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify(textsToTranslate),
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON response
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const translated: string[] = JSON.parse(cleaned);

    if (!Array.isArray(translated) || translated.length !== headlines.length) {
      console.warn("[translate] Mismatch in translation count, using originals");
      return headlines;
    }

    return headlines.map((h, i) => ({
      ...h,
      headline: translated[i] || h.headline,
    }));
  } catch (err) {
    console.error("[translate] Translation failed, using originals:", err);
    return headlines;
  }
}

/**
 * Translate short central-bank editorial paragraphs (from TradingEconomics) to
 * PT-BR using Claude Haiku. Returns null on failure so the caller can null out
 * `summary` rather than mixing English with a Portuguese UI.
 *
 * Input and output arrays are 1:1 by index.
 */
export async function translateBankSummaries(
  texts: string[]
): Promise<string[] | null> {
  if (texts.length === 0) return [];
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[translate] No ANTHROPIC_API_KEY, skipping summary translation");
    return null;
  }

  try {
    const response = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: `Voce e um tradutor financeiro. Traduza cada paragrafo para PT-BR natural.
Mantenha termos tecnicos em ingles: Fed, FOMC, CPI, NFP, PPI, GDP, PMI, ISM, ECB, BoJ, BoE, BoC, BCB, Copom, S&P, Nasdaq, Dow, VIX, bps, etc.
Mantenha nomes proprios, tickers, siglas e porcentagens exatamente como no original.
Nao invente, resuma nem edite o conteudo — apenas traduza fielmente.
Responda APENAS com um JSON array de strings traduzidas, na mesma ordem do input.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify(texts),
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const translated: string[] = JSON.parse(cleaned);

    if (!Array.isArray(translated) || translated.length !== texts.length) {
      console.warn("[translate] Summary translation count mismatch");
      return null;
    }
    return translated;
  } catch (err) {
    console.error("[translate] Summary translation failed:", err);
    return null;
  }
}
