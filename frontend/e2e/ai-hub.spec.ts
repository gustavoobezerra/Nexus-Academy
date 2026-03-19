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

async function openSearchSuggestions(page: Page, placeholder: string) {
  const input = page.getByPlaceholder(placeholder);
  await input.click();
  return input;
}

test.describe('AI Hub', () => {
  test('should open the assistant and create a persistent student group', async ({ page, request }) => {
    await primeTeacherSession(page, request);
    await page.goto(`${FRONTEND_URL}/ai-hub`);
    const groupName = `Grupo E2E ${Date.now()}`;

    await expect(page.getByText('Operacao')).toBeVisible();
    await expect(page.getByText('Workspace')).toHaveCount(0);
    await expect(page.getByText('Ferramentas de IA com dados reais do professor.')).toBeVisible();

    await page.getByRole('button', { name: /IA de ensino/i }).click();
    await expect(page.getByText('Assistente do professor')).toBeVisible();

    await page.getByPlaceholder('Ex: quais alunos merecem reforço esta semana?').fill('Quais alunos precisam de mais atencao agora?');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText(/alunos|atividade|pagamento/i).first()).toBeVisible();

    await page.getByRole('button', { name: /^Grupos$/ }).click();
    await expect(page.getByText('Persistir grupos reutilizáveis para o AI Hub.')).toBeVisible();

    await page.getByPlaceholder('Ex: Reforço de algebra').fill(groupName);
    const studentSearch = await openSearchSuggestions(page, 'Buscar por aluno, série ou matéria...');
    await expect(page.getByRole('main').getByText('Base ativa', { exact: true })).toBeVisible();
    await studentSearch.fill('Lia');
    await expect(page.locator('strong').filter({ hasText: 'Lia' }).first()).toBeVisible();
    await page.getByRole('button', { name: /^Lia Demo\b/i }).click();
    const secondSearch = await openSearchSuggestions(page, 'Buscar por aluno, série ou matéria...');
    await secondSearch.fill('Caio');
    await page.getByRole('button', { name: /^Caio Demo\b/i }).click();
    await page.getByText('Novo grupo').click();
    await page.getByRole('button', { name: 'Criar grupo' }).click();

    await expect(page.getByText(groupName).first()).toBeVisible();
  });

  test('should generate and publish an activity, then expose it in the student portal', async ({ browser, page, request }) => {
    await primeTeacherSession(page, request);
    await page.goto(`${FRONTEND_URL}/ai-hub`);

    await page.getByRole('button', { name: /Criação de atividades/i }).click();
    await expect(page.getByText('Gerar, revisar e publicar sem sair do fluxo.')).toBeVisible();

    await page.getByRole('button', { name: /Descrição livre/i }).click();
    await page.getByPlaceholder('Ex: Matemática').fill('Matemática');
    await page.getByPlaceholder('Ex: Equações do 2o grau').fill('Equações do 2o grau');
    await page.getByPlaceholder('Ex: verificar se o aluno consegue aplicar o conceito').fill('Verificar se o aluno sabe identificar delta e resolver as raizes');
    await page.getByPlaceholder('Descreva o que foi explicado, quais exemplos foram resolvidos e que dificuldade você quer verificar.').fill(
      'Foi explicada a formula de Bhaskara, o papel do delta e a resolucao de exemplos completos de equacoes do segundo grau com duas raizes reais.'
    );
    await page.getByRole('button', { name: 'Todos' }).click();
    await page.getByRole('button', { name: 'Gerar atividade' }).click();

    await expect(page.getByText('Publicar no portal')).toBeVisible();
    await page.getByRole('button', { name: 'Publicar no portal' }).click();
    await expect(page.getByText(/Atividade publicada para/i)).toBeVisible();

    const portalPage = await browser.newPage();
    await portalPage.goto(`${FRONTEND_URL}/portal/login`);
    await portalPage.locator('input[type="email"]').fill('aluno.demo@nexus.com');
    await portalPage.locator('input[type="password"]').fill('Aluno@123');
    await portalPage.getByRole('button', { name: 'Entrar' }).click();
    await portalPage.getByRole('button', { name: 'Atividades' }).click();

    await expect(portalPage.getByText('Atividade: Equações do 2o grau').first()).toBeVisible();
  });

  test('should generate a lesson plan and schedule a new class from smart suggestions', async ({ page, request }) => {
    await primeTeacherSession(page, request);
    await page.goto(`${FRONTEND_URL}/ai-hub`);

    await page.getByRole('button', { name: /Preparação automática/i }).click();
    await expect(page.getByText('Gerar plano completo a partir de uma aula real.')).toBeVisible();

    await openSearchSuggestions(page, 'Buscar por aula, aluno ou matéria...');
    await page.getByPlaceholder('Buscar por aula, aluno ou matéria...').fill('Reforco');
    await page.getByRole('button', { name: /Reforco de Algebra.*19\/03\/2026/i }).click();
    await page.getByRole('button', { name: 'Gerar preparação' }).click();

    await expect(page.getByRole('button', { name: 'Aprovar plano' })).toBeEnabled();
    await page.getByRole('button', { name: 'Aprovar plano' }).click();
    await expect(page.getByText(/Plano aprovado/i)).toBeVisible();

    await page.getByRole('button', { name: /AI Hub/i }).click();
    await page.getByRole('button', { name: /Agendamento inteligente/i }).click();

    await openSearchSuggestions(page, 'Buscar aluno...');
    await page.getByPlaceholder('Buscar aluno...').fill('Lia');
    await page.getByRole('button', { name: /^Lia Demo\b/i }).click();
    await page.getByPlaceholder('Ex: Matemática - revisão guiada').fill('Matemática - treino orientado E2E');
    await page.getByRole('button', { name: 'Gerar sugestões' }).click();

    await expect(page.getByRole('button', { name: 'Criar aula' }).first()).toBeVisible();
  });
});
