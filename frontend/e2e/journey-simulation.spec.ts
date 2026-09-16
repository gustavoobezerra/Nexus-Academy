import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function loginDemoTeacher(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { email: 'demo@nexus.com', password: 'Nexus@123' }
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return {
    token: data.token as string,
    user: { ...(data.user as { id: string; name: string; email: string }), slug: 'demo-nexus' }
  };
}

async function primeTeacherSession(page: Page, request: APIRequestContext) {
  const teacher = await loginDemoTeacher(request);
  await page.addInitScript(({ user, token }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('onboarding_concluido', 'true');
  }, teacher);
  return teacher;
}

test.describe('Journey simulation - purchase, invite, scheduling and live class', () => {
  test.describe.configure({ mode: 'serial' });

  // Stage 1: a brand-new teacher walks through registration + onboarding up to the
  // subscription step (the "purchase"). Confirms the flow is graceful even though
  // Stripe isn't configured in this environment (an external-account dependency,
  // exactly like the Daily.co video provider).
  test('new teacher can register and walk the onboarding wizard up to the subscription/checkout step', async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    const stamp = Date.now();
    const teacherEmail = `prof.jornada.${stamp}@test.com`;
    const slug = `prof-jornada-${stamp}`;

    await page.goto(`${FRONTEND_URL}/professor/login`);
    await page.getByRole('button', { name: /^Criar conta$/ }).first().click();
    await expect(page.getByRole('heading', { name: /criar conta/i })).toBeVisible();

    await page.getByPlaceholder('Seu nome completo').fill('Professor Jornada E2E');
    await page.locator('input[type="email"]').first().fill(teacherEmail);
    await page.locator('input[type="password"]').first().fill('Senha123!');
    const confirmField = page.locator('input[type="password"]').nth(1);
    if (await confirmField.count()) {
      await confirmField.fill('Senha123!');
    }
    await page.getByRole('button', { name: /criar conta/i }).last().click();

    // Onboarding wizard should appear (Step 1 - slug)
    await expect(page.locator('text=/Seu Link Personalizado/i').first()).toBeVisible({ timeout: 20000 });

    const slugInput = page.locator('input[placeholder="seu-nome"]').first();
    await slugInput.fill(slug);
    await expect(page.locator('text=/dispon[ií]vel/i').first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /^Continuar/i }).click();

    // Step 2 - payment method: skip ("configure later")
    await expect(page.locator('text=/Receber Pagamentos|Como você quer receber/i').first()).toBeVisible({ timeout: 15000 });
    const skipButton = page.getByRole('button', { name: /pular|configurar depois|fazer isso depois/i }).first();
    if (await skipButton.count()) {
      await skipButton.click();
    } else {
      // fallback: pick manual/external and continue
      await page.getByRole('button', { name: /^Continuar/i }).click();
    }

    // Step 3 - subscription plan (the actual "purchase")
    await expect(page.locator('text=/Escolha Seu Plano|Assinatura Nexus Academy/i').first()).toBeVisible({ timeout: 15000 });
    await page.locator('text=/Plano Básico/i').first().click();
    await page.getByRole('button', { name: /Finalizar e Ir para Pagamento|Continuar/i }).click();

    // Without STRIPE_SECRET_KEY configured, the backend returns 500; api.service shows
    // "Erro no servidor. Nossa equipe foi notificada..." and rejects with "Erro interno do servidor".
    // Either toast is an acceptable graceful signal — just confirm there is no silent crash.
    await expect(page.locator('text=/Erro.*servidor|Stripe não configurado/i').first()).toBeVisible({ timeout: 15000 });

    // The app shell must remain usable after the error (no crash / blank page)
    await expect(page.locator('text=/Escolha Seu Plano|Assinatura Nexus Academy/i').first()).toBeVisible();
  });

  // Stage 2: using the already-onboarded demo teacher (= "purchase" already completed),
  // simulate inviting a student via the public link, scheduling a class, and opening
  // the live class as both teacher and student to confirm the video screen loads.
  test('teacher invites a student via public link, schedules a class, and both can open the live class', async ({ page, request }) => {
    test.setTimeout(6 * 60 * 1000);
    const teacher = await loginDemoTeacher(request);
    const stamp = Date.now();
    const studentEmail = `aluno.jornada.${stamp}@test.com`;
    const studentPassword = 'Senha123!';

    // --- Convite por link: aluno se cadastra pela página pública do professor ---
    await page.goto(`${FRONTEND_URL}/professor/${teacher.user.slug}`);
    await page.fill('input[name="name"]', 'Aluno Jornada E2E');
    await page.fill('input[name="email"]', studentEmail);
    await page.fill('input[name="age"]', '20');
    await page.fill('input[name="grade"]', '2º ano');
    await page.fill('input[name="password"]', studentPassword);
    await page.fill('input[name="confirmPassword"]', studentPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/portal\/onboarding/);

    // --- Resolve the freshly created Student record (linked to the demo teacher) ---
    let studentId: string | null = null;
    for (let attempt = 0; attempt < 10 && !studentId; attempt += 1) {
      const studentsResponse = await request.get(`${API_URL}/api/students?limit=200`, {
        headers: { Authorization: `Bearer ${teacher.token}` }
      });
      expect(studentsResponse.ok()).toBeTruthy();
      const studentsBody = await studentsResponse.json();
      const list = Array.isArray(studentsBody) ? studentsBody : (studentsBody.students || []);
      const match = list.find((s: { email?: string; portalAccess?: { email?: string }; _id?: string; id?: string }) =>
        s.email === studentEmail || s.portalAccess?.email === studentEmail);
      if (match) {
        studentId = match._id || match.id || null;
      } else {
        await page.waitForTimeout(800);
      }
    }
    expect(studentId, 'Student created via the public invite link should be linked to the teacher').toBeTruthy();

    // --- Agendamento da aula (API, mirrors the "Agendar Aula" form submission) ---
    const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const classTitle = `Aula Jornada E2E ${stamp}`;
    const createClassResponse = await request.post(`${API_URL}/api/classes`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
      data: {
        studentId,
        title: classTitle,
        subject: 'Matemática',
        topic: 'Frações',
        scheduledAt,
        duration: 50
      }
    });
    expect(createClassResponse.ok()).toBeTruthy();
    const createdClass = (await createClassResponse.json()).class;
    expect(createdClass?._id).toBeTruthy();

    // --- Teacher opens the live-class video screen via the UI (INICIAR button) ---
    await primeTeacherSession(page, request);

    const teacherErrors: string[] = [];
    page.on('pageerror', (err) => teacherErrors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error' && !/favicon|DevTools/i.test(msg.text())) teacherErrors.push(msg.text()); });

    await page.context().grantPermissions(['camera', 'microphone'], { origin: FRONTEND_URL });
    await page.goto(`${FRONTEND_URL}/`);
    // Navigate to Aulas tab and find the test class card
    await expect(page.getByRole('button', { name: 'Aulas', exact: true }).first()).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Aulas', exact: true }).first().click();
    await page.waitForTimeout(1200);
    // Find the specific class card for this test (title unique via timestamp).
    // The card div has classes rounded-2xl + shadow-sm which are not on any inner sub-div.
    const classCard = page.locator('div.rounded-2xl.shadow-sm').filter({ hasText: classTitle }).first();
    await expect(classCard).toBeVisible({ timeout: 15000 });
    // Click the INICIAR button scoped to this card (avoids clicking a demo class's button)
    await classCard.getByRole('button', { name: 'INICIAR' }).click();
    await page.waitForTimeout(2000);

    // Live-class screen should mount regardless of provider (Daily.co or Jitsi).
    await expect(page.locator('text=/Você está ensinando/i').first()).toBeVisible({ timeout: 20000 });
    // Both providers render an iframe (Daily via createFrame, Jitsi via JitsiMeeting)
    await expect(page.locator('iframe').first()).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: 'test-results/journey-teacher-live-class.png' }).catch(() => {});

    // Jitsi in a headless browser generates known non-app errors: no camera/mic devices,
    // custom URL schemes (jitsi-meet:), and 404s for Jitsi-internal resources. Filter them out.
    const realErrors = teacherErrors.filter((e) =>
      !/ResizeObserver|Permissions policy|jitsi|jit\.si|ERR_UNKNOWN_URL_SCHEME|gum\.|AudioContext|tracks\]|Failed to load resource/i.test(e)
    );
    expect(realErrors, `Unexpected app errors while opening the live class as teacher: ${realErrors.join(' | ')}`).toEqual([]);

    await page.locator('button:has-text("Encerrar")').first().click().catch(() => {});
    await page.waitForTimeout(1000);

    // --- Student logs in, sees the scheduled class, and opens the live-class screen ---
    const studentPage = await page.context().browser()!.newContext().then((ctx) => ctx.newPage());
    const studentErrors: string[] = [];
    studentPage.on('pageerror', (err) => studentErrors.push(err.message));
    studentPage.on('console', (msg) => { if (msg.type() === 'error' && !/favicon|DevTools/i.test(msg.text())) studentErrors.push(msg.text()); });
    await studentPage.context().grantPermissions(['camera', 'microphone'], { origin: FRONTEND_URL });

    await studentPage.goto(`${FRONTEND_URL}/portal/login`);
    await studentPage.locator('input[type="email"]').fill(studentEmail);
    await studentPage.locator('input[type="password"]').fill(studentPassword);
    await studentPage.click('button:has-text("Entrar")');
    await expect(studentPage).toHaveURL(/\/portal\/onboarding|\/portal\/dashboard/, { timeout: 20000 });

    // If the smart-onboarding wizard intercepts, the student dashboard is reached via the shell anyway
    if (studentPage.url().includes('/portal/onboarding')) {
      await studentPage.goto(`${FRONTEND_URL}/portal/dashboard`);
    }
    await expect(studentPage.getByRole('button', { name: 'Minhas Aulas', exact: true }).first()).toBeVisible({ timeout: 20000 });
    await studentPage.getByRole('button', { name: 'Minhas Aulas', exact: true }).first().click();
    await studentPage.waitForTimeout(1200);
    await expect(studentPage.locator(`text=${classTitle}`).first()).toBeVisible({ timeout: 15000 });

    await studentPage.goto(`${FRONTEND_URL}/portal/live-class?classId=${createdClass._id}&className=${encodeURIComponent(classTitle)}&teacherName=${encodeURIComponent(teacher.user.name)}`);
    await expect(studentPage.locator(`text=${classTitle}`).first()).toBeVisible({ timeout: 20000 });
    await expect(studentPage.locator('iframe').first()).toBeVisible({ timeout: 30000 });
    await studentPage.screenshot({ path: 'test-results/journey-student-live-class.png' }).catch(() => {});

    const realStudentErrors = studentErrors.filter((e) =>
      !/ResizeObserver|Permissions policy|jitsi|jit\.si|ERR_UNKNOWN_URL_SCHEME|gum\.|AudioContext|tracks\]|Failed to load resource/i.test(e)
    );
    expect(realStudentErrors, `Unexpected app errors while opening the live class as student: ${realStudentErrors.join(' | ')}`).toEqual([]);

    await studentPage.context().close();
  });
});
