import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

function visibleNowPlaying(page: Page) {
  return page
    .getByRole("region", { name: "Player" })
    .getByLabel(/Now playing beat number/i)
    .filter({ visible: true });
}

async function assertBornAccessible(page: Page) {
  const axeResults = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .analyze();
  expect(axeResults.violations).toEqual([]);

  const labelPass = axeResults.passes.find((pass) => pass.id === "label");
  const placeholderOnlyNodes =
    labelPass?.nodes.filter((node) => {
      const checkIds = (node.any ?? []).map((check) => check.id);
      return (
        checkIds.length > 0 &&
        checkIds.every((id) => id === "non-empty-placeholder")
      );
    }) ?? [];
  expect(placeholderOnlyNodes).toEqual([]);

  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollEl = document.scrollingElement ?? document.documentElement;
    return Math.round(scrollEl.scrollWidth - vw);
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("Navigation & static pages", () => {
  test("redirects /beats to the root landing page", async ({ page }) => {
    await page.goto("/beats");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeVisible();
  });

  test("renders 404 for an unknown beat ID, keeps playback paused, and starts next beat on Play", async ({
    page,
  }) => {
    const response = await page.goto("/beat/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: /404 — Beat Not Found/i }),
    ).toBeVisible();

    const playerBar = page.getByRole("complementary", {
      name: "Persistent Audio Player",
    });
    await expect(
      playerBar.getByRole("button", { name: "Play audio" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Start Radio Stream/i }).click();
    await expect(page).toHaveURL(/\/beat\/track-[a-c]/);
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(playerBar).toHaveCount(0);
  });

  test("navigates across About, Terms of Service, and Privacy Policy via poster info links", async ({
    page,
  }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Information" });
    await expect(nav).toBeVisible();

    await nav.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL("/about");
    await expect(
      page.getByRole("heading", { level: 2, name: "About Beats for Days" }),
    ).toBeVisible();

    await nav.getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL("/privacy");
    await expect(
      page.getByRole("heading", { level: 2, name: "Privacy & Data" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Return to player" }).click();
    await expect(page).toHaveURL(/\/|\/beat\/.+/);
  });

  test("redirects legacy terms and privacy routes to /privacy", async ({
    page,
  }) => {
    await page.goto("/terms-of-service");
    await expect(page).toHaveURL("/privacy");
    await page.goto("/privacy-policy");
    await expect(page).toHaveURL("/privacy");
  });
});

test.describe("Debug panel", () => {
  const toggleName = "Toggle history debug panel";

  test("stays hidden without ?debug=1 or cookie", async ({ page }) => {
    await page.goto("/beat/track-a");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: toggleName })).toHaveCount(0);
  });

  test("shows playback and history state with ?debug=1 and persists across back/forward navigation", async ({
    page,
  }) => {
    await page.goto("/beat/track-a?debug=1");
    const debugButton = page.getByRole("button", { name: toggleName });
    await expect(debugButton).toBeVisible();
    await debugButton.click();

    const debugRegion = page.getByRole("region", {
      name: "Playback and history state",
    });
    await expect(debugRegion).toBeVisible();
    await expect(debugRegion).toContainText("Played History");
    await expect(debugRegion).toContainText("History Stack Length:");

    const firstNumber = await visibleNowPlaying(page).textContent();
    await page.getByRole("button", { name: "Next beat" }).click();
    await expect(page).toHaveURL(/\/beat\/track-[b-c]/);
    expect(page.url()).not.toContain("debug=1");
    await expect(visibleNowPlaying(page)).not.toHaveText(firstNumber ?? "");

    await expect(page.getByRole("button", { name: toggleName })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Playback and history state" }),
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL("/beat/track-a?debug=1");
    await expect(
      page.getByRole("region", { name: "Playback and history state" }),
    ).toBeVisible();

    await page
      .getByRole("region", { name: "Playback and history state" })
      .getByRole("button", { name: "Close debug panel" })
      .click();
    await expect(
      page.getByRole("region", { name: "Playback and history state" }),
    ).not.toBeVisible();
  });
});

test.describe("Radio landing & playback flow", () => {
  test("starts radio stream from the poster, controls playback, and pauses when returning home", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Persistent Audio Player" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Play" }).click();
    await expect(page).toHaveURL(/\/beat\/.+/);
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    const initialUrl = page.url();
    const initialNumber = (await visibleNowPlaying(page).textContent()) ?? "";

    await page.getByRole("button", { name: "Next beat" }).click();
    await expect(visibleNowPlaying(page)).not.toHaveText(initialNumber);
    const firstSkipUrl = page.url();
    expect(firstSkipUrl).not.toBe(initialUrl);
    const firstSkipNumber = (await visibleNowPlaying(page).textContent()) ?? "";

    await page.evaluate(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    });
    await page.keyboard.press("ArrowRight");
    await expect(visibleNowPlaying(page)).not.toHaveText(firstSkipNumber);
    const secondSkipUrl = page.url();
    expect(secondSkipUrl).not.toBe(firstSkipUrl);

    await page.goBack();
    await expect(page).toHaveURL(firstSkipUrl);
    await expect(visibleNowPlaying(page)).toHaveText(firstSkipNumber);

    await page.goBack();
    await expect(page).toHaveURL(initialUrl);
    await expect(visibleNowPlaying(page)).toHaveText(initialNumber);

    await page.goForward();
    await expect(page).toHaveURL(firstSkipUrl);
    await page.goForward();
    await expect(page).toHaveURL(secondSkipUrl);

    await page.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL("/about");
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    await page.getByRole("link", { name: "Return to player" }).click();
    await expect(page).toHaveURL(secondSkipUrl);
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  });
});

test.describe("Generation route (disabled for MVP)", () => {
  test("returns 404 not found when navigating to /generate", async ({
    page,
  }) => {
    const response = await page.goto("/generate");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "404 — Beat Not Found",
      }),
    ).toBeVisible();
  });
});

test.describe("Born-Accessible UI & WCAG 2.2 AA verification", () => {
  test("exposes semantic landmarks, ARIA live regions, keyboard focus navigation, and reduced motion support", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Information" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("region", { name: "Player" })).toBeVisible();

    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings).toHaveCount(1);

    const liveRegions = page.locator('[aria-live="polite"]');
    await expect(liveRegions.first()).toBeAttached();

    await page.keyboard.press("Tab");
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  for (const route of ["/", "/beat/track-a", "/about", "/privacy"]) {
    test(`has zero axe-core WCAG 2.2 AA violations and reflows at 320px on ${route}`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(
        page.getByRole("complementary", { name: "Persistent Audio Player" }),
      ).toHaveCount(0);
      await assertBornAccessible(page);
    });
  }
});
