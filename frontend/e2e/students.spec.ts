import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function loginDemoTeacher(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: 'demo@nexus.com',
      password: 'Nexus@123'
    }
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  return {
    token: data.token as string,
    user: {
      ...(data.user as { id: string; name: string; email: string; onboardingCompletedAt?: string }),
      slug: 'demo-nexus'
    }
  };
}

async function primeTeacherSession(page: Page, request: APIRequestContext) {
  const teacher = await loginDemoTeacher(request);

  await page.addInitScript(({ user, token }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('onboarding_concluido', 'true');
  }, teacher);
}

test.describe('Teacher Dashboard', () => {
  test('should render dashboard and students tab for an authenticated teacher', async ({ page, request }) => {
    await primeTeacherSession(page, request);

    await page.goto(FRONTEND_URL);

    await expect(page.locator('text=/Bem-vindo|Dashboard/').first()).toBeVisible();
    await page.click('button:has-text("Alunos")');
    await expect(page.locator('h3:has-text("Alunos")')).toBeVisible();
  });

  test('should load students, classes and online tabs without local API connection errors', async ({ page, request }) => {
    await primeTeacherSession(page, request);

    await page.goto(FRONTEND_URL);

    await expect(page.locator('text=/Bem-vindo|Dashboard/').first()).toBeVisible();
    await expect(page.getByText('Sem conexão com o servidor')).toHaveCount(0);

    await page.getByRole('button', { name: 'Alunos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Alunos' })).toBeVisible();
    await expect(page.getByPlaceholder('Pesquise por nome, email ou telefone...')).toBeVisible();
    await expect(page.getByText('Erro ao carregar lista de alunos')).toHaveCount(0);
    await expect(page.getByText('Sem conexão com o servidor')).toHaveCount(0);

    await page.getByRole('button', { name: 'Aulas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Aulas' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Agendar Aula|Agendar Nova Aula/i })).toBeVisible();
    await expect(page.getByText('Erro ao carregar dados')).toHaveCount(0);
    await expect(page.getByText('Sem conexão com o servidor')).toHaveCount(0);

    await page.getByRole('button', { name: 'Calendário', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Calendário', exact: true }).first()).toBeVisible();
    await expect(page.getByText('Sem conexão com o servidor')).toHaveCount(0);

    await page.getByRole('button', { name: 'Online', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Alunos Online' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dar Pontos' }).first()).toBeVisible();
    await expect(page.getByText('Erro ao carregar alunos')).toHaveCount(0);
    await expect(page.getByText('Sem conexão com o servidor')).toHaveCount(0);
  });
});
