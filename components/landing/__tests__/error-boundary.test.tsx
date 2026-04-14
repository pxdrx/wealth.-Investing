import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ShowcaseErrorBoundary } from "../ShowcaseErrorBoundary";

function Thrower(): JSX.Element {
  throw new Error("boom");
}

describe("ShowcaseErrorBoundary", () => {
  it("renders fallback UI when a child throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ShowcaseErrorBoundary>
        <Thrower />
      </ShowcaseErrorBoundary>
    );
    expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it("renders children normally when no throw", () => {
    render(
      <ShowcaseErrorBoundary>
        <div>ok content</div>
      </ShowcaseErrorBoundary>
    );
    expect(screen.getByText("ok content")).toBeInTheDocument();
  });
});
