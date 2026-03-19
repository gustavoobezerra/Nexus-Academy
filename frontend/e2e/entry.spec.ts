import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('Entry Surfaces', () => {
  test('should render the editorial landing page and expose both access roles', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    await expect(
      page.getByRole('heading', { name: /ensino com ritmo, gestão com assinatura/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /sou aluno/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sou professor/i })).toBeVisible();
  });

  test('should open the teacher login flow and allow switching to register mode', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.getByRole('button', { name: /sou professor/i }).click();

    await expect(page).toHaveURL(/\/professor\/login/);
    await expect(page.getByRole('heading', { name: /entrar/i })).toBeVisible();

    await page.getByRole('button', { name: /^Criar conta$/ }).first().click();

    await expect(page.getByRole('heading', { name: /criar conta/i })).toBeVisible();
    await expect(page.getByPlaceholder('Seu nome completo')).toBeVisible();
  });

  test('should keep the landing page usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(FRONTEND_URL);

    await expect(page.getByRole('button', { name: /sou aluno/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sou professor/i })).toBeVisible();
  });

  test('should allow scrolling on the teacher register flow in mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(`${FRONTEND_URL}/professor/login`);
    await page.getByRole('button', { name: /^Criar conta$/ }).first().click();

    const initialScrollY = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 1400);

    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(initialScrollY);
  });
});
