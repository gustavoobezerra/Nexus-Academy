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

async function loginDemoStudentPortal(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/api/portal/auth/login`, {
    data: {
      email: 'aluno.demo@nexus.com',
      password: 'Aluno@123'
    }
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  return {
    token: data.token as string
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

  test('should open messages/templates and expose teacher activity review', async ({ page, request }) => {
    await primeTeacherSession(page, request);
    const teacher = await loginDemoTeacher(request);
    const student = await loginDemoStudentPortal(request);
    const activityTitle = `Dissertativa revisão ${Date.now()}`;

    const workspaceResponse = await request.get(`${API_URL}/api/ai/workspace-data`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`
      }
    });
    expect(workspaceResponse.ok()).toBeTruthy();
    const workspaceData = await workspaceResponse.json();
    const lia = (workspaceData.students as Array<{ _id: string; email?: string; portalAccess?: { email?: string } }>).find(
      (candidate) => candidate.portalAccess?.email === 'aluno.demo@nexus.com' || candidate.email === 'aluno.demo@nexus.com'
    );
    expect(lia?._id).toBeTruthy();

    const publishResponse = await request.post(`${API_URL}/api/ai/publish-activity`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`
      },
      data: {
        title: activityTitle,
        description: 'Atividade dissertativa para validar a correção do professor.',
        type: 'exercise',
        questions: [
          {
            questionNumber: 1,
            type: 'essay',
            question: 'Explique por que a organização do estudo melhora o resultado do aluno.',
            difficulty: 'medium',
            points: 10,
            correctAnswer: 'A resposta deve relacionar organização, constância e aplicação prática do conteúdo.',
            explanation: 'A organização melhora a execução e reduz erros de revisão.',
            topics: ['Organização do estudo']
          }
        ],
        assignmentTarget: {
          mode: 'specific',
          studentIds: [lia._id]
        },
        aiMetadata: {
          sourceTranscript: 'Criado para teste E2E',
          topics: ['Pedagogia', 'Organização do estudo'],
          providerMode: 'fallback',
          sourceType: 'manual',
          learningObjective: 'Validar correção manual pelo professor'
        }
      }
    });
    expect(publishResponse.ok()).toBeTruthy();
    const publishedActivityId = ((await publishResponse.json()).activities as Array<{ _id: string }>)[0]._id;

    const submitResponse = await request.post(`${API_URL}/api/portal/activities/${publishedActivityId}/submissions`, {
      headers: {
        Authorization: `Bearer ${student.token}`
      },
      data: {
        answers: [
          {
            questionNumber: 1,
            answer: 'Porque estudar de forma organizada ajuda a manter constancia e aplicar melhor os conceitos.'
          }
        ]
      }
    });
    expect(submitResponse.ok()).toBeTruthy();

    await page.goto(FRONTEND_URL);

    await page.getByRole('button', { name: 'Mensagens', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Centro de Mensagens' })).toBeVisible();
    await expect(page.getByText('Recurso não encontrado')).toHaveCount(0);
    await expect(page.getByText('Nova mensagem')).toBeVisible();

    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Templates de Mensagens' })).toBeVisible();

    await page.getByRole('button', { name: 'Hub', exact: true }).click();
    await page.getByRole('main').getByRole('button', { name: 'Templates', exact: true }).click();
    await expect(page.getByRole('main').getByText('Mesma base usada na aba de mensagens do professor.')).toBeVisible();

    await page.getByRole('button', { name: 'Atividades', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Atividades Enviadas' })).toBeVisible();
    await page.getByRole('button', { name: new RegExp(activityTitle, 'i') }).click();
    await expect(page.getByText('Resposta do aluno')).toBeVisible();
    await page.getByRole('button', { name: 'Certo' }).first().click();
    await page.getByPlaceholder('Comentário para o aluno nesta questão.').fill('Boa resposta. Mantenha esse nível de clareza.');
    await page.getByPlaceholder('Resumo final da correção para o aluno.').fill('Excelente revisão. Continue reforçando a constância.');
    await page.getByRole('button', { name: 'Salvar correção' }).click();

    await expect(page.getByText('Correção salva e enviada para o aluno.')).toBeVisible();
  });
});
