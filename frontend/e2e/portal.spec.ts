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

    const detailPanel = page.locator('section').filter({
      has: page.getByRole('heading', { name: new RegExp(activityTitle, 'i') })
    }).first();

    await detailPanel.getByRole('button', { name: /^A\./i }).click();
    await detailPanel.getByPlaceholder('Digite sua resposta.').fill('organizado');

    await detailPanel.getByRole('button', { name: 'Enviar atividade' }).click();
    await expect(detailPanel.getByText(/Último resultado:/i)).toBeVisible();
  });

  test('should analyze pronunciation and show the real provider state explicitly', async ({ page }) => {
    await page.addInitScript(() => {
      const createFakeAudioBuffer = (length = 16000, sampleRate = 16000) => {
        const data = new Float32Array(length);
        for (let index = 0; index < length; index += 1) {
          data[index] = Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.4;
        }

        return {
          duration: length / sampleRate,
          length,
          sampleRate,
          numberOfChannels: 1,
          getChannelData: () => data
        };
      };

      const buildWavBytes = () => {
        const sampleRate = 16000;
        const durationSeconds = 1;
        const totalSamples = sampleRate * durationSeconds;
        const dataSize = totalSamples * 2;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        const writeString = (offset, value) => {
          for (let index = 0; index < value.length; index += 1) {
            view.setUint8(offset + index, value.charCodeAt(index));
          }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        for (let index = 0; index < totalSamples; index += 1) {
          const sample = Math.sin((2 * Math.PI * 440 * index) / sampleRate);
          view.setInt16(44 + (index * 2), Math.round(sample * 0x3fff), true);
        }

        return buffer;
      };

      class FakeAudioContext {
        async decodeAudioData() {
          return createFakeAudioBuffer();
        }

        async close() {
          return undefined;
        }
      }

      class FakeOfflineAudioContext {
        constructor(_channels, length, sampleRate) {
          this.length = length;
          this.sampleRate = sampleRate;
          this.destination = {};
        }

        createBuffer(_channels, length, sampleRate) {
          return createFakeAudioBuffer(length, sampleRate);
        }

        createBufferSource() {
          return {
            connect: () => undefined,
            start: () => undefined,
            set buffer(value) {
              this._buffer = value;
            }
          };
        }

        async startRendering() {
          return createFakeAudioBuffer(this.length, this.sampleRate);
        }
      }

      class FakeMediaRecorder {
        constructor(stream) {
          this.stream = stream;
          this.ondataavailable = null;
          this.onstop = null;
          this.state = 'inactive';
        }

        start() {
          this.state = 'recording';
        }

        stop() {
          this.state = 'inactive';
          const wavBlob = new Blob([buildWavBytes()], { type: 'audio/wav' });
          if (this.ondataavailable) {
            this.ondataavailable({ data: wavBlob });
          }
          if (this.onstop) {
            this.onstop();
          }
        }
      }

      Object.defineProperty(window, 'MediaRecorder', {
        configurable: true,
        writable: true,
        value: FakeMediaRecorder
      });

      Object.defineProperty(window, 'AudioContext', {
        configurable: true,
        writable: true,
        value: FakeAudioContext
      });

      Object.defineProperty(window, 'OfflineAudioContext', {
        configurable: true,
        writable: true,
        value: FakeOfflineAudioContext
      });

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => ({
            getTracks: () => [{ stop: () => undefined }]
          })
        }
      });
    });

    await page.route('**/api/portal/pronunciation/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            phrase: 'Practice makes perfect.',
            source: 'gemini',
            providerMode: 'live',
            providerModel: 'gemini-2.5-flash'
          }
        })
      });
    });

    await page.route('**/api/portal/pronunciation/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            analysis: {
              accuracyScore: 0.84,
              fluencyScore: 0.81,
              pronunciationScore: 0.83,
              feedback: 'Resultado beta útil para treino e histórico, sem contaminar os insights do professor.',
              wordScores: [
                { word: 'Practice', score: 0.82, syllables: [{ text: 'Prac', score: 0.82 }] },
                { word: 'makes', score: 0.84, syllables: [{ text: 'makes', score: 0.84 }] },
                { word: 'perfect.', score: 0.83, syllables: [{ text: 'perfect', score: 0.83 }] }
              ],
              mock: false,
              source: 'assemblyai-beta',
              providerMode: 'beta',
              providerModel: 'universal-3-pro',
              configurationPending: false,
              metadata: {
                service: 'assemblyai',
                recognizedText: 'Practice makes perfect.'
              }
            }
          }
        })
      });
    });

    await page.goto(`${FRONTEND_URL}/portal/login`);
    await page.fill('input[type="email"]', 'aluno.demo@nexus.com');
    await page.fill('input[type="password"]', 'Aluno@123');
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL(/\/portal\/dashboard|\/portal\/onboarding/);

    await page.goto(`${FRONTEND_URL}/portal/pronunciation-test`);
    await expect(page.getByRole('heading', { name: 'Pronunciation Test' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Practice makes perfect.' })).toBeVisible();

    await page.getByRole('button', { name: 'Gravar' }).click();
    await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible();
    await page.getByRole('button', { name: 'Parar' }).click();
    await expect(page.locator('audio')).toBeVisible();
    const analyzeRequest = page.waitForRequest('**/api/portal/pronunciation/analyze');
    const analyzeResponse = page.waitForResponse('**/api/portal/pronunciation/analyze');
    await page.getByRole('button', { name: 'Analisar' }).click();
    await analyzeRequest;
    await analyzeResponse;

    await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible();
    await expect(page.getByText(/AssemblyAI beta/)).toBeVisible();
  });
});
