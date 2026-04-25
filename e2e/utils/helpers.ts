import type { Page } from "@playwright/test";

/**
 * Helpers de teste e2e para o Food Service.
 *
 * Centraliza seletores e funções utilitárias para evitar
 * regressão e facilitar manutenção por QA agents.
 */

// ── Seletores robustos (data-testid) ──────────────────────────────
export const SELECTORS = {
  cartBadge: "[data-testid='cart-badge']",
} as const;

/**
 * Aguarda o carregamento completo da página de cardápio.
 */
export async function waitForMenuLoad(page: Page, timeout = 10000) {
  await page.waitForLoadState("networkidle");
  await page.locator("text=Adicionar").first().waitFor({ timeout });
}

/**
 * Retorna a quantidade exibida no badge do carrinho
 */
export async function getCartBadgeCount(page: Page): Promise<number> {
  const badge = await page.locator(SELECTORS.cartBadge).first();
  const text = (await badge.textContent().catch(() => "0")) ?? "0";
  return Number.parseInt(text.trim(), 10) || 0;
}
