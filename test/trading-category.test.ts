import { describe, it, expect } from "vitest"
import { inferCategory } from "@/lib/trading/category"

describe("inferCategory", () => {
  it("classifies major forex pairs", () => {
    expect(inferCategory("EURUSD")).toBe("forex")
    expect(inferCategory("GBPJPY")).toBe("forex")
  })

  it("classifies commodities", () => {
    expect(inferCategory("XAUUSD")).toBe("commodities")
    expect(inferCategory("USOIL")).toBe("commodities")
  })

  it("classifies indices", () => {
    expect(inferCategory("US30")).toBe("indices")
    expect(inferCategory("NAS100")).toBe("indices")
  })

  it("classifies crypto", () => {
    expect(inferCategory("BTCUSD")).toBe("crypto")
    expect(inferCategory("ETHUSD")).toBe("crypto")
  })

  it("strips MT5 suffixes before classifying", () => {
    expect(inferCategory("XAUUSD.raw")).toBe("commodities")
    expect(inferCategory("US30.cash")).toBe("indices")
    expect(inferCategory("NAS100.mini")).toBe("indices")
  })

  it("handles partial pattern matching", () => {
    expect(inferCategory("BTCEUR")).toBe("crypto")
    expect(inferCategory("GOLDX")).toBe("commodities")
    expect(inferCategory("DOWJONES")).toBe("indices")
  })

  it("returns forex as safe default for unknown symbols", () => {
    expect(inferCategory("UNKNOWN123")).toBe("forex")
    expect(inferCategory("")).toBe("forex")
  })

  it("classifies CME futures", () => {
    expect(inferCategory("MNQ")).toBe("futures")
    expect(inferCategory("MGC")).toBe("futures")
    expect(inferCategory("M6A")).toBe("futures")
    expect(inferCategory("ES")).toBe("futures")
    expect(inferCategory("NQ")).toBe("futures")
    expect(inferCategory("CL")).toBe("futures")
    expect(inferCategory("ZB")).toBe("futures")
  })

  it("classifies common stocks and ETFs", () => {
    expect(inferCategory("AAPL")).toBe("stocks")
    expect(inferCategory("SPY")).toBe("stocks")
    expect(inferCategory("TSLA")).toBe("stocks")
    expect(inferCategory("QQQ")).toBe("stocks")
  })
})
