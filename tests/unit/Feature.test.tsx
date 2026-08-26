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
  it("renders the live drawing surface with a clear first action", () => {
    render(<Feature room={createMockRoom()} config={config} />);
    expect(screen.getByRole("heading", { name: "Draw first. Finish clean." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start 30-second round" })).toBeEnabled();
  });
});
