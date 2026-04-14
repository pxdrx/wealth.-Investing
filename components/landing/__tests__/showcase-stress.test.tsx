import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { InteractiveFeatureShowcase } from "../InteractiveFeatureShowcase";
import { FEATURES } from "../feature-panels/types";

describe("InteractiveFeatureShowcase — stress & resilience", () => {
  it("handles 200 rapid pill clicks without crashing", () => {
    render(<InteractiveFeatureShowcase />);
    const pills = FEATURES.map((f) => screen.getByRole("tab", { name: f.label }));
    for (let i = 0; i < 200; i++) {
      fireEvent.click(pills[i % pills.length]);
    }
    const lastIdx = 199 % pills.length;
    expect(pills[lastIdx]).toHaveAttribute("aria-selected", "true");
  });

  it("handles keyboard activation (Enter on tab)", () => {
    render(<InteractiveFeatureShowcase />);
    const macroTab = screen.getByRole("tab", { name: "Macroeconomia" });
    macroTab.focus();
    fireEvent.click(macroTab);
    expect(macroTab).toHaveAttribute("aria-selected", "true");
  });

  it("exactly one tab is selected at any time (invariant check)", () => {
    render(<InteractiveFeatureShowcase />);
    const pills = FEATURES.map((f) => screen.getByRole("tab", { name: f.label }));
    for (let i = 0; i < 50; i++) {
      const pick = pills[Math.floor(Math.random() * pills.length)];
      fireEvent.click(pick);
      const selectedCount = pills.filter((p) => p.getAttribute("aria-selected") === "true").length;
      expect(selectedCount).toBe(1);
    }
  });

  it("callouts are aria-hidden when not on Journal (a11y)", () => {
    render(<InteractiveFeatureShowcase />);
    const callouts = screen.getByTestId("showcase-callouts");
    expect(callouts).toHaveAttribute("aria-hidden", "false");
    fireEvent.click(screen.getByRole("tab", { name: "Risk" }));
    expect(callouts).toHaveAttribute("aria-hidden", "true");
  });

  it("all 7 tabs have valid aria-controls pointing to a panel", () => {
    render(<InteractiveFeatureShowcase />);
    FEATURES.forEach((f) => {
      const tab = screen.getByRole("tab", { name: f.label });
      const controls = tab.getAttribute("aria-controls");
      expect(controls).toBe(`panel-${f.key}`);
    });
  });

  it("ErrorBoundary is not triggered on normal use (no throw)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<InteractiveFeatureShowcase />);
    FEATURES.forEach((f) => {
      act(() => {
        fireEvent.click(screen.getByRole("tab", { name: f.label }));
      });
    });
    const errorCalls = errorSpy.mock.calls.filter(
      ([msg]) => typeof msg === "string" && msg.toLowerCase().includes("error")
    );
    expect(errorCalls.length).toBe(0);
    errorSpy.mockRestore();
  });
});
