import { test, expect, type APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function createTeacher(request: APIRequestContext) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const email = `prof.${suffix}@test.com`;
  const password = 'Senha123!';
  const slug = `prof-${suffix}`.toLowerCase();

  const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
    data: {
      name: `Professor ${suffix}`,
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

  const setSlugResponse = await request.post(`${API_URL}/api/onboarding/set-slug`, {
    headers: authHeaders,
    data: { slug }
  });
  expect(setSlugResponse.ok()).toBeTruthy();

  const skipPaymentResponse = await request.post(`${API_URL}/api/onboarding/skip-payment`, {
    headers: authHeaders
  });
  expect(skipPaymentResponse.ok()).toBeTruthy();

  const completeResponse = await request.post(`${API_URL}/api/onboarding/complete`, {
    headers: authHeaders
  });
  expect(completeResponse.ok()).toBeTruthy();
  const completeData = await completeResponse.json();

  return {
    token,
    slug,
    user: completeData.user as { id: string; name: string; email: string; slug: string; onboardingCompletedAt?: string }
  };
}

test.describe('Student Portal', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/portal/login`);

    await expect(page.locator('text=Portal do Aluno')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Entrar")')).toBeVisible();
  });

  test('should register a student through the teacher public link', async ({ page, request }) => {
    const teacher = await createTeacher(request);
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
    const teacher = await createTeacher(request);
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
});
