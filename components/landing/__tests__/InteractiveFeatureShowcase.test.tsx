import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InteractiveFeatureShowcase } from "../InteractiveFeatureShowcase";

describe("InteractiveFeatureShowcase", () => {
  it("renders Journal panel by default", () => {
    render(<InteractiveFeatureShowcase />);
    expect(screen.getByRole("tab", { name: "Journal" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Equity curve/i)).toBeInTheDocument();
  });

  it("switches to IA Coach panel when its pill is clicked", () => {
    render(<InteractiveFeatureShowcase />);
    fireEvent.click(screen.getByRole("tab", { name: "IA Coach" }));
    expect(screen.getByRole("tab", { name: "IA Coach" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/análise automática/i)).toBeInTheDocument();
  });

  it("switches to Macroeconomia panel", () => {
    render(<InteractiveFeatureShowcase />);
    fireEvent.click(screen.getByRole("tab", { name: "Macroeconomia" }));
    expect(screen.getByText(/Calendário macroeconômico/i)).toBeInTheDocument();
  });

  it("renders all 7 pills", () => {
    render(<InteractiveFeatureShowcase />);
    ["Journal", "IA Coach", "Macroeconomia", "Dexter", "Backtest", "Risk", "Mentor"].forEach((label) => {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    });
  });

  it("shows callouts only on Journal panel (desktop)", () => {
    render(<InteractiveFeatureShowcase />);
    // Callouts container has data-testid="showcase-callouts"
    expect(screen.getByTestId("showcase-callouts")).toHaveAttribute("data-visible", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Dexter" }));
    expect(screen.getByTestId("showcase-callouts")).toHaveAttribute("data-visible", "false");
  });
});
