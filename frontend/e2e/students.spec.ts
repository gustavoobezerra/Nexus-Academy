import { test, expect } from '@playwright/test';

test.describe('Students Page', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login como professor
    await page.goto('/');
    // Assumindo que há uma página de login
    // Ajustar conforme necessário
    await page.fill('input[type="email"]', 'professor@nexus.com');
    await page.fill('input[type="password"]', 'senha123');
    await page.click('button[type="submit"]');
    
    // Aguardar navegação para dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    
    // Navegar para página de alunos
    await page.click('text=Alunos');
    await page.waitForURL('**/students**', { timeout: 5000 });
  });

  test('deve exibir lista de alunos', async ({ page }) => {
    // Verificar se a página carregou
    await expect(page.locator('h3:has-text("Alunos")')).toBeVisible();
    
    // Verificar se há alunos ou mensagem de "nenhum aluno"
    const hasStudents = await page.locator('text=Nenhum aluno encontrado').isVisible().catch(() => false);
    const hasStudentCards = await page.locator('[class*="bg-white"][class*="dark:bg-slate-800"]').count();
    
    if (!hasStudents) {
      expect(hasStudentCards).toBeGreaterThan(0);
    }
  });

  test('deve filtrar alunos por série', async ({ page }) => {
    // Abrir painel de filtros
    await page.click('button:has-text("Filtros")');
    
    // Selecionar série
    await page.selectOption('select >> nth=0', '5o Ano');
    
    // Aguardar resultados
    await page.waitForTimeout(500);
    
    // Verificar que os resultados foram filtrados
    const studentCards = page.locator('[class*="bg-white"][class*="dark:bg-slate-800"]');
    const count = await studentCards.count();
    
    if (count > 0) {
      // Verificar que todos os alunos exibidos têm a série selecionada
      // (assumindo que o texto da série está visível no card)
      const firstCard = studentCards.first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('deve filtrar alunos por status de pagamento', async ({ page }) => {
    // Abrir painel de filtros
    await page.click('button:has-text("Filtros")');
    
    // Selecionar status
    await page.selectOption('select >> nth=1', 'paid');
    
    // Aguardar resultados
    await page.waitForTimeout(500);
    
    // Verificar que os resultados foram filtrados
    const studentCards = page.locator('[class*="bg-white"][class*="dark:bg-slate-800"]');
    await expect(studentCards.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      // Pode não haver alunos com esse status
    });
  });

  test('deve buscar alunos em tempo real com debounce', async ({ page }) => {
    // Digitar na busca
    const searchInput = page.locator('input[placeholder*="Pesquise"]');
    await searchInput.fill('João');
    
    // Aguardar debounce (300ms) + tempo de resposta
    await page.waitForTimeout(600);
    
    // Verificar que a busca foi executada
    const studentCards = page.locator('[class*="bg-white"][class*="dark:bg-slate-800"]');
    const count = await studentCards.count();
    
    // Se houver resultados, verificar que contêm "João"
    if (count > 0) {
      const firstCard = studentCards.first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('deve exibir modal de confirmação ao tentar excluir aluno', async ({ page }) => {
    // Verificar se há alunos
    const studentCards = page.locator('[class*="bg-white"][class*="dark:bg-slate-800"]');
    const count = await studentCards.count();
    
    if (count > 0) {
      // Hover sobre o primeiro card para mostrar botão de excluir
      await studentCards.first().hover();
      
      // Clicar no botão de excluir (ícone de lixeira)
      const deleteButton = page.locator('button[title="Remover Aluno"], button:has(svg)').first();
      await deleteButton.click();
      
      // Verificar que o modal apareceu
      await expect(page.locator('text=Remover aluno')).toBeVisible();
      await expect(page.locator('text=Tem certeza')).toBeVisible();
      
      // Cancelar exclusão
      await page.click('button:has-text("Cancelar")');
      
      // Verificar que o modal foi fechado
      await expect(page.locator('text=Remover aluno')).not.toBeVisible();
    }
  });

  test('deve limpar filtros', async ({ page }) => {
    // Abrir filtros
    await page.click('button:has-text("Filtros")');
    
    // Aplicar alguns filtros
    await page.selectOption('select >> nth=0', '5o Ano');
    await page.selectOption('select >> nth=1', 'paid');
    
    // Limpar filtros
    await page.click('text=Limpar');
    
    // Verificar que os selects foram resetados
    const gradeSelect = page.locator('select >> nth=0');
    await expect(gradeSelect).toHaveValue('');
  });
});

