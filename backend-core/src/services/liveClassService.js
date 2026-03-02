/**
 * Serviço de Aulas Ao Vivo Integrado
 * Gerencia sessões de aula dentro da plataforma usando WebRTC
 */

import Class from '../models/Class.js';
import Student from '../models/Student.js';
import HourBank from '../models/HourBank.js';
import emailService from './emailService.js';
import automationEngine from './automationEngine.js';
import { transcribeAudio } from './transcriptionService.js';

class LiveClassService {
  constructor() {
    this.activeSessions = new Map(); // sessionId -> session data
    this.recordings = new Map(); // sessionId -> recording data
  }

  /**
   * Iniciar sessão de aula ao vivo
   */
  async startLiveSession(classId, teacherId, io) {
    try {
      const classData = await Class.findOne({ _id: classId, teacher: teacherId })
        .populate('student', 'name email portalAccess');

      if (!classData) {
        throw new Error('Aula não encontrada');
      }

      if (classData.status !== 'scheduled') {
        throw new Error('Aula não está agendada');
      }

      const sessionId = `live_${classId}_${Date.now()}`;
      const session = {
        sessionId,
        classId: classId.toString(),
        teacherId: teacherId.toString(),
        studentId: classData.student._id.toString(),
        studentName: classData.student.name,
        studentEmail: classData.student.email,
        startTime: new Date(),
        status: 'active',
        participants: {
          teacher: { id: teacherId.toString(), joined: true, joinedAt: new Date() },
          student: { id: classData.student._id.toString(), joined: false }
        },
        recording: {
          enabled: false,
          startTime: null,
          endTime: null,
          videoUrl: null
        },
        transcript: '',
        messages: [],
        duration: 0
      };

      this.activeSessions.set(sessionId, session);

      // Atualizar status da aula
      classData.status = 'in_progress';
      classData.startedAt = new Date();
      await classData.save();

      // Notificar aluno via Socket.IO
      io.to(`student:${classData.student._id}`).emit('class-started', {
        sessionId,
        classId,
        title: classData.title,
        teacherName: 'Professor'
      });

      // Enviar notificação por email/WhatsApp
      await this.sendClassStartNotification(classData, sessionId);

      return {
        success: true,
        session,
        roomId: sessionId
      };
    } catch (error) {
      console.error('Error starting live session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Aluno entrar na sessão
   */
  async joinSession(sessionId, userId, userType, io) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Sessão não encontrada' };
    }

    if (userType === 'student' && session.studentId !== userId.toString()) {
      return { success: false, error: 'Acesso negado' };
    }

    if (userType === 'teacher' && session.teacherId !== userId.toString()) {
      return { success: false, error: 'Acesso negado' };
    }

    // Atualizar participante
    if (userType === 'student') {
      session.participants.student.joined = true;
      session.participants.student.joinedAt = new Date();
    }

    // Notificar outros participantes
    io.to(sessionId).emit('participant-joined', {
      userId,
      userType,
      timestamp: new Date()
    });

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      session
    };
  }

  /**
   * Finalizar sessão de aula
   */
  async endLiveSession(sessionId, teacherId, io) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Sessão não encontrada' };
      }

      if (session.teacherId !== teacherId.toString()) {
        return { success: false, error: 'Acesso negado' };
      }

      const endTime = new Date();
      const duration = Math.floor((endTime - session.startTime) / 1000 / 60); // minutos

      // Atualizar aula
      const classData = await Class.findById(session.classId);
      if (classData) {
        classData.status = 'completed';
        classData.endedAt = endTime;
        classData.actualDuration = duration;
        classData.transcript = session.transcript;
        await classData.save();
      }

      // Transcrição AssemblyAI — dispara em background se houver URL de gravação
      if (session.recording.videoUrl) {
        const classId = session.classId;
        transcribeAudio(session.recording.videoUrl).then(async (result) => {
          if (result.success && result.text && !result.isMock) {
            await Class.findByIdAndUpdate(classId, { transcript: result.text });
            console.log(`✅ Transcrição salva para aula ${classId}`);
          }
        }).catch(err => console.error('Transcription error:', err));
      }

      // Descontar horas do banco de horas
      await this.deductHoursFromBank(session.studentId, session.teacherId, duration);

      // Salvar gravação se houver
      if (session.recording.enabled && session.recording.videoUrl) {
        await this.saveRecording(sessionId, session);
      }

      // Notificar aluno
      io.to(`student:${session.studentId}`).emit('class-ended', {
        sessionId,
        duration,
        transcript: session.transcript
      });

      // Enviar resumo por email
      await this.sendClassSummary(session, classData);

      // Remover sessão ativa
      this.activeSessions.delete(sessionId);

      return {
        success: true,
        session: {
          ...session,
          endTime,
          duration
        }
      };
    } catch (error) {
      console.error('Error ending live session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Descontar horas do banco de horas
   */
  async deductHoursFromBank(studentId, teacherId, minutes) {
    try {
      const hoursUsed = minutes / 60;
      const hourBank = await HourBank.findOne({
        student: studentId,
        teacher: teacherId,
        active: true
      });

      if (hourBank) {
        const purchased = Number(hourBank.totalHoursPurchased || 0);
        const consumed = Number(hourBank.hoursConsumed || 0) + hoursUsed;
        hourBank.hoursConsumed = consumed;
        hourBank.hoursRemaining = Math.max(0, purchased - consumed);
        await hourBank.save();

        // Alertas automáticos
        const percentageRemaining = purchased > 0
          ? (hourBank.hoursRemaining / purchased) * 100
          : 0;
        if (percentageRemaining <= 25 && percentageRemaining > 10) {
          // Alerta 25%
          await automationEngine.trigger('hour_bank_low', {
            studentId,
            percentageRemaining,
            hoursRemaining: hourBank.hoursRemaining
          });
        } else if (percentageRemaining <= 10 && percentageRemaining > 0) {
          // Alerta crítico 10%
          await automationEngine.trigger('hour_bank_critical', {
            studentId,
            percentageRemaining,
            hoursRemaining: hourBank.hoursRemaining
          });
        } else if (hourBank.hoursRemaining <= 0) {
          // Bloquear agendamentos
          await automationEngine.trigger('hour_bank_empty', {
            studentId,
            hoursRemaining: 0
          });
        }
      }
    } catch (error) {
      console.error('Error deducting hours:', error);
    }
  }

  /**
   * Salvar gravação da aula
   */
  async saveRecording(sessionId, session) {
    try {
      const recording = {
        sessionId,
        classId: session.classId,
        studentId: session.studentId,
        teacherId: session.teacherId,
        videoUrl: session.recording.videoUrl,
        transcript: session.transcript,
        duration: session.duration,
        startTime: session.startTime,
        endTime: new Date(),
        createdAt: new Date()
      };

      // Persistir URL de gravação na aula (MongoDB)
      await Class.findByIdAndUpdate(session.classId, {
        recordingUrl: session.recording.videoUrl
      });

      // Cache em memória como backup
      this.recordings.set(sessionId, recording);

      console.log(`✅ Gravação salva para aula ${session.classId}: ${session.recording.videoUrl}`);
      return { success: true, recording };
    } catch (error) {
      console.error('Error saving recording:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar notificação de início de aula
   */
  async sendClassStartNotification(classData, sessionId) {
    try {
      const student = await Student.findById(classData.student);
      if (!student) return;

      const classUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/live-class/${sessionId}`;

      await emailService.sendEmail({
        to: student.parentEmail || student.email,
        subject: `Aula Iniciada: ${classData.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Aula Iniciada</h2>
            <p>Olá ${student.parentName || student.name}!</p>
            <p>A aula <strong>${classData.title}</strong> foi iniciada.</p>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Aluno:</strong> ${student.name}</p>
              <p><strong>Horário:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <p>
              <a href="${classUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Entrar na Aula
              </a>
            </p>
          </div>
        `
      });

      // WhatsApp (se configurado)
      if (student.parentPhone) {
        await automationEngine.trigger('class_started', {
          studentId: student._id,
          classId: classData._id,
          phone: student.parentPhone,
          message: `Aula "${classData.title}" foi iniciada. Acesse: ${classUrl}`
        });
      }
    } catch (error) {
      console.error('Error sending class start notification:', error);
    }
  }

  /**
   * Enviar resumo da aula por email
   */
  async sendClassSummary(session, classData) {
    try {
      const student = await Student.findById(session.studentId);
      if (!student) return;

      await emailService.sendEmail({
        to: student.parentEmail || student.email,
        subject: `Resumo da Aula: ${classData.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Resumo da Aula</h2>
            <p>Olá ${student.parentName || student.name}!</p>
            <p>A aula <strong>${classData.title}</strong> foi concluída.</p>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Duração:</strong> ${session.duration} minutos</p>
              <p><strong>Data:</strong> ${new Date(session.startTime).toLocaleDateString('pt-BR')}</p>
              ${session.transcript ? `
                <div style="margin-top: 15px;">
                  <strong>Transcrição:</strong>
                  <p style="background: white; padding: 15px; border-radius: 4px; margin-top: 10px;">
                    ${session.transcript.substring(0, 500)}${session.transcript.length > 500 ? '...' : ''}
                  </p>
                </div>
              ` : ''}
            </div>
            <p>Obrigado por confiar no Nexus Academy!</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending class summary:', error);
    }
  }

  /**
   * Obter sessão ativa
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Listar sessões ativas do professor
   */
  getTeacherActiveSessions(teacherId) {
    return Array.from(this.activeSessions.values())
      .filter(s => s.teacherId === teacherId.toString());
  }
}

export default new LiveClassService();

