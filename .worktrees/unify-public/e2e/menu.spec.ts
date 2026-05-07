import { expect, test } from "@playwright/test";
import { SELECTORS, getCartBadgeCount, waitForMenuLoad } from "./utils/helpers";

test.describe("Cardápio Público / Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/menu/pizzaria-central");
    await waitForMenuLoad(page);
  });

  test("deve renderizar o header com nome do restaurante", async ({ page }) => {
    await expect(page.getByText("Pizzaria Central")).toBeVisible();
    await expect(page.getByText("Pizzas artesanais")).toBeVisible();
  });

  test("deve renderizar categorias e produtos", async ({ page }) => {
    // Espera a seção "Bebidas"
    await expect(page.locator("h2", { hasText: "Bebidas" })).toBeVisible({ timeout: 5000 });

    // Verifica que existem cards de produtos
    const products = page.locator("text=Adicionar");
    await expect(products.first()).toBeVisible();
    const count = await products.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("deve exibir badge correta ao adicionar item", async ({ page }) => {
    // Estado inicial: badge não existe
    await expect(page.locator(SELECTORS.cartBadge)).toHaveCount(0);

    // Clica no primeiro botão "Adicionar"
    const btn = page.locator("button", { hasText: /Adicionar/i }).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(500);

    // ── ASSERT crítica: regressão do Issue #37 ──
    const badge = page.locator(SELECTORS.cartBadge);
    await expect(badge).toBeVisible({ timeout: 5000 });
    await expect(badge).toHaveText("1", { timeout: 5000 });

    // Confirma via helper
    expect(await getCartBadgeCount(page)).toBe(1);
  });

  test("deve permitir adicionar múltiplos itens e manter badge correta", async ({ page }) => {
    // Adiciona primeiro item
    const btn1 = page.locator("button", { hasText: /Adicionar/i }).first();
    await btn1.scrollIntoViewIfNeeded();
    await btn1.click();
    await page.waitForTimeout(600);
    await expect(page.locator(SELECTORS.cartBadge)).toHaveText("1");

    // Fecha o sheet (pressiona Escape)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Adiciona segundo item
    const btn2 = page.locator("button", { hasText: /Adicionar/i }).nth(1);
    await btn2.scrollIntoViewIfNeeded();
    await btn2.click();
    await page.waitForTimeout(600);

    // Badge deve ser 2
    await expect(page.locator(SELECTORS.cartBadge)).toHaveText("2");
  });

  test("deve mostrar carrinho vazio se nenhum item foi adicionado", async ({ page }) => {
    await expect(page.locator(SELECTORS.cartBadge)).toHaveCount(0);

    // Abre o carrinho clicando no header button que tem ícone
    await page
      .locator("header button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();
    await expect(page.locator("text=Carrinho vazio")).toBeVisible();
  });
});
