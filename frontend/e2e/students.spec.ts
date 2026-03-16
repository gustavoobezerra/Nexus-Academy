import { test, expect, type APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function createTeacherWithStudent(request: APIRequestContext) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const email = `teacher.${suffix}@test.com`;
  const password = 'Senha123!';
  const slug = `teacher-${suffix}`.toLowerCase();

  const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
    data: {
      name: `Teacher ${suffix}`,
      email,
      password,
      phone: '11999999999'
    }
  });

  expect(registerResponse.ok()).toBeTruthy();
  const registerData = await registerResponse.json();
  const token = registerData.token as string;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  await request.post(`${API_URL}/api/onboarding/set-slug`, {
    headers: authHeaders,
    data: { slug }
  });
  await request.post(`${API_URL}/api/onboarding/skip-payment`, {
    headers: authHeaders
  });
  const completeResponse = await request.post(`${API_URL}/api/onboarding/complete`, {
    headers: authHeaders
  });
  const completeData = await completeResponse.json();

  const createStudentResponse = await request.post(`${API_URL}/api/students`, {
    headers: authHeaders,
    data: {
      name: 'Aluno Dashboard',
      age: 16,
      grade: '9º Ano',
      monthlyFee: 500,
      parentName: 'Responsável Teste',
      parentEmail: `responsavel.${suffix}@test.com`,
      parentPhone: '(11) 99999-9999'
    }
  });
  expect(createStudentResponse.ok()).toBeTruthy();

  return {
    token,
    user: completeData.user as { id: string; name: string; email: string; slug: string; onboardingCompletedAt?: string }
  };
}

test.describe('Teacher Dashboard', () => {
  test('should render dashboard and students tab for an authenticated teacher', async ({ page, request }) => {
    const teacher = await createTeacherWithStudent(request);

    await page.addInitScript(({ user, token }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('onboarding_concluido', 'true');
    }, teacher);

    await page.goto(FRONTEND_URL);

    await expect(page.locator('text=/Bem-vindo|Dashboard/').first()).toBeVisible();
    await page.click('button:has-text("Alunos")');
    await expect(page.locator('h3:has-text("Alunos")')).toBeVisible();
  });
});
