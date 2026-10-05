import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('Student Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página de login do portal
    await page.goto(`${FRONTEND_URL}/portal/login`);
  });

  test('should display login page correctly', async ({ page }) => {
    // Verificar elementos da página de login
    await expect(page.locator('text=Portal do Aluno')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Entrar")')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Preencher credenciais inválidas
    await page.fill('input[type="email"]', 'invalid@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Entrar")');

    // Verificar mensagem de erro
    await expect(page.locator('text=/Credenciais inválidas|Erro ao fazer login/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields', async ({ page }) => {
    // Tentar submeter sem preencher campos
    await page.click('button:has-text("Entrar")');

    // Verificar validação HTML5
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should navigate to dashboard after successful login', async ({ page, request }) => {
    // Criar aluno de teste via API
    const createStudentResponse = await request.post(`${API_URL}/api/students`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TEACHER_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Aluno Teste E2E',
        email: 'aluno.e2e@test.com',
        age: 15,
        grade: '9º Ano',
        subject: 'Matemática',
        parentName: 'Pai Teste',
        parentEmail: 'pai@test.com',
        parentPhone: '(11) 99999-9999',
        monthlyFee: 500,
        portalAccess: {
          enabled: true,
          email: 'aluno.e2e@test.com',
          password: await hashPassword('senha123')
        }
      }
    });

    if (createStudentResponse.ok()) {
      // Fazer login
      await page.fill('input[type="email"]', 'aluno.e2e@test.com');
      await page.fill('input[type="password"]', 'senha123');
      await page.click('button:has-text("Entrar")');

      // Verificar redirecionamento para dashboard
      await expect(page).toHaveURL(/.*\/portal\/dashboard/, { timeout: 10000 });

      // Verificar elementos do dashboard
      await expect(page.locator('text=/Visão Geral|Portal do Aluno/i')).toBeVisible();
    }
  });

  test('should display student information on dashboard', async ({ page }) => {
    // Assumindo que já está logado (precisa de setup prévio)
    await page.goto(`${FRONTEND_URL}/portal/dashboard`);

    // Verificar se há informações do aluno
    // Nota: Este teste requer autenticação prévia
    const hasStudentInfo = await page.locator('text=/Pontos|Desempenho|Próximas Aulas/i').count() > 0;
    expect(hasStudentInfo).toBeTruthy();
  });

  test('should navigate between tabs', async ({ page }) => {
    // Assumindo que já está logado
    await page.goto(`${FRONTEND_URL}/portal/dashboard`);

    // Testar navegação entre abas
    const tabs = ['Visão Geral', 'Aulas', 'Pagamentos', 'Perfil'];

    for (const tabName of tabs) {
      await page.click(`text=${tabName}`);
      await expect(page.locator(`text=${tabName}`)).toBeVisible();
    }
  });

  test('should handle logout correctly', async ({ page }) => {
    // Assumindo que já está logado
    await page.goto(`${FRONTEND_URL}/portal/dashboard`);

    // Clicar em logout
    await page.click('button[aria-label="Logout"], button:has([data-testid="logout-icon"])');

    // Verificar redirecionamento para login
    await expect(page).toHaveURL(/.*\/portal\/login/, { timeout: 5000 });
  });

  test('should display classes list', async ({ page }) => {
    // Assumindo que já está logado
    await page.goto(`${FRONTEND_URL}/portal/dashboard`);

    // Navegar para aba de aulas
    await page.click('text=Aulas');

    // Verificar se a lista de aulas é exibida
    // Pode estar vazia, mas a estrutura deve existir
    const classesSection = page.locator('text=/Minhas Aulas|Nenhuma aula/i');
    await expect(classesSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display payments list', async ({ page }) => {
    // Assumindo que já está logado
    await page.goto(`${FRONTEND_URL}/portal/dashboard`);

    // Navegar para aba de pagamentos
    await page.click('text=Pagamentos');

    // Verificar se a lista de pagamentos é exibida
    const paymentsSection = page.locator('text=/Meus Pagamentos/i');
    await expect(paymentsSection).toBeVisible({ timeout: 5000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Testar em viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/portal/login`);

    // Verificar se elementos estão visíveis
    await expect(page.locator('text=Portal do Aluno')).toBeVisible();

    // Verificar se há menu hambúrguer (se implementado)
    const menuButton = page.locator('button[aria-label*="menu"], button:has([data-testid*="menu"])');
    if (await menuButton.count() > 0) {
      await menuButton.click();
      // Verificar se sidebar abre
      await expect(page.locator('nav, aside')).toBeVisible();
    }
  });
});

// Helper function para hash de senha (simulado)
async function hashPassword(password: string): Promise<string> {
  // Em produção, isso seria feito no backend
  // Aqui é apenas para o teste
  return password; // Simplificado para testes
}
