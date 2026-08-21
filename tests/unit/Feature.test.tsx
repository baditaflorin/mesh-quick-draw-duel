import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { Feature, fmt, isValidResult } from "../../src/Feature";
import { config } from "../../src/config";
describe("quick draw", () => {
  it("formats a shared round timer", () => expect(fmt(9000)).toBe("0:09"));
  it("requires a positive mark count", () => {
    expect(isValidResult({ finishedAt: 1, marks: 1 })).toBe(true);
    expect(isValidResult({ finishedAt: 1, marks: 0 })).toBe(false);
  });
  it("renders fallback drawing controls", () => {
    render(<Feature room={createMockRoom()} config={config} />);
    expect(
      screen.getByRole("heading", { name: "Thirty seconds. Make your mark." }),
    ).toBeInTheDocument();
  });
});
