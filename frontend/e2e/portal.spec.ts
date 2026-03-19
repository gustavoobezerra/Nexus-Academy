import { test, expect, type APIRequestContext } from '@playwright/test';

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
    slug: 'demo-nexus',
    user: {
      ...(data.user as { id: string; name: string; email: string; onboardingCompletedAt?: string }),
      slug: 'demo-nexus'
    }
  };
}

test.describe('Student Portal', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/portal/login`);

    await expect(page.getByRole('heading', { name: /Portal do Aluno/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Entrar")')).toBeVisible();
  });

  test('should register a student through the teacher public link', async ({ page, request }) => {
    const teacher = await loginDemoTeacher(request);
    const studentEmail = `aluno.${Date.now()}@test.com`;

    await page.goto(`${FRONTEND_URL}/professor/${teacher.slug}`);

    await page.fill('input[name="name"]', 'Aluno E2E');
    await page.fill('input[name="email"]', studentEmail);
    await page.fill('input[name="age"]', '19');
    await page.fill('input[name="grade"]', '3º ano');
    await page.fill('input[name="password"]', 'Senha123!');
    await page.fill('input[name="confirmPassword"]', 'Senha123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/portal\/onboarding/);
    await expect(page.locator('text=Qual matéria você veio aprender?')).toBeVisible();
  });

  test('should login an existing portal student', async ({ page, request }) => {
    const teacher = await loginDemoTeacher(request);
    const studentEmail = `portal.${Date.now()}@test.com`;
    const password = 'senha123';

    const registerResponse = await request.post(`${API_URL}/api/portal/auth/register`, {
      data: {
        name: 'Aluno Login',
        email: studentEmail,
        password,
        age: 21,
        grade: 'Ensino Médio',
        teacherId: teacher.user.id
      }
    });

    expect(registerResponse.ok()).toBeTruthy();

    await page.goto(`${FRONTEND_URL}/portal/login`);
    await page.fill('input[type="email"]', studentEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Entrar")');

    await expect(page).toHaveURL(/\/portal\/onboarding|\/portal\/dashboard/);
  });

  test('should open a published activity and submit it from the student portal', async ({ page, request }) => {
    const teacher = await loginDemoTeacher(request);
    const workspaceResponse = await request.get(`${API_URL}/api/ai/workspace-data`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`
      }
    });

    expect(workspaceResponse.ok()).toBeTruthy();
    const workspaceData = await workspaceResponse.json();
    const lia = (workspaceData.students as Array<{ _id: string; name: string; email?: string; portalAccess?: { email?: string } }>).find(
      (student) => student.portalAccess?.email === 'aluno.demo@nexus.com' || student.email === 'aluno.demo@nexus.com'
    );

    expect(lia?._id).toBeTruthy();
    const activityTitle = `Atividade portal E2E ${Date.now()}`;

    const publishResponse = await request.post(`${API_URL}/api/ai/publish-activity`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`
      },
      data: {
        title: activityTitle,
        description: 'Atividade publicada especificamente para validar submissão no portal.',
        type: 'exercise',
        questions: [
          {
            questionNumber: 1,
            type: 'multiple_choice',
            question: 'Qual alternativa representa a revisão correta?',
            difficulty: 'easy',
            points: 10,
            options: [
              { letter: 'A', text: 'Revisar o conceito e aplicar em exemplo novo.', isCorrect: true },
              { letter: 'B', text: 'Ignorar os dados do enunciado.', isCorrect: false }
            ],
            explanation: 'A revisão guiada depende de leitura e aplicação.',
            topics: ['Revisão guiada']
          },
          {
            questionNumber: 2,
            type: 'fill_blank',
            question: 'O estudo precisa ser ____ e consistente.',
            difficulty: 'easy',
            points: 10,
            correctAnswer: 'organizado',
            explanation: 'Organização ajuda na execução.',
            topics: ['Revisão guiada']
          }
        ],
        assignmentTarget: {
          mode: 'specific',
          studentIds: [lia._id]
        },
        aiMetadata: {
          sourceTranscript: 'Atividade publicada por Playwright',
          topics: ['Matematica', 'Revisão guiada'],
          providerMode: 'fallback',
          sourceType: 'manual',
          learningObjective: 'Confirmar o envio do aluno no portal'
        }
      }
    });

    expect(publishResponse.ok()).toBeTruthy();

    await page.goto(`${FRONTEND_URL}/portal/login`);
    await page.fill('input[type="email"]', 'aluno.demo@nexus.com');
    await page.fill('input[type="password"]', 'Aluno@123');
    await page.click('button:has-text("Entrar")');

    await page.getByRole('button', { name: 'Atividades' }).click();
    const pendingActivityCard = page.getByRole('button', { name: new RegExp(activityTitle, 'i') }).first();
    await expect(pendingActivityCard).toBeVisible();
    await pendingActivityCard.click();
    await expect(page.getByText('Selecione uma atividade')).toHaveCount(0);

    const answerButtons = page.locator('section').last().locator('article').first().locator('button');
    if (await answerButtons.count()) {
      await answerButtons.first().click();
    }

    const textareas = page.locator('textarea');
    if (await textareas.count()) {
      await textareas.first().fill('Resposta enviada pelo portal E2E.');
    }

    await page.getByRole('button', { name: 'Enviar atividade' }).click();
    await expect(page.getByText(/Último resultado:/i)).toBeVisible();
  });
});
