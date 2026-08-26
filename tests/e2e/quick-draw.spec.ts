import { expect, test, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};

async function closeInitiallyOpenSettings(page: Page): Promise<void> {
  const settings = page.getByRole("dialog", { name: "Settings" });
  if (!(await settings.isVisible().catch(() => false))) return;
  const close = settings.getByRole("button", { name: "close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  else await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
}

test("a shared round synchronizes marks and the finish order", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix: pkg.name,
  });
  try {
    await Promise.all([closeInitiallyOpenSettings(a), closeInitiallyOpenSettings(b)]);
    await a.getByPlaceholder("Duelist name").fill("Ari");
    await b.getByPlaceholder("Duelist name").fill("Bea");

    await a.getByRole("button", { name: "Start 30-second round" }).click();
    await expect(b.getByRole("button", { name: "Add line mark" })).toBeVisible();

    await a.getByRole("button", { name: "Add star mark" }).click();
    await expect(b.getByText("1 mark", { exact: true })).toBeVisible();
    await b.getByRole("button", { name: "Add line mark" }).click();
    await expect(a.getByText("2 marks", { exact: true })).toBeVisible();

    await a.getByRole("button", { name: "Finish my drawing" }).click();
    await b.getByRole("button", { name: "Finish my drawing" }).click();
    await expect(a.locator(".quick-draw-results li")).toHaveCount(2);
    await expect(b.locator(".quick-draw-results li")).toHaveCount(2);
  } finally {
    await cleanup();
  }
});

test("the first round action stays visible on phone and short desktop", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1141, height: 602 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await closeInitiallyOpenSettings(page);

    const action = page.getByRole("button", { name: "Start 30-second round" });
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(box, `missing action box at ${viewport.width}×${viewport.height}`).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  }
});
