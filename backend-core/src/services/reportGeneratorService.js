/**
 * Serviço de Geração de Relatórios Automáticos para Pais
 * Gera PDFs e envia por email
 */

import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Payment from '../models/Payment.js';
import Course from '../models/Course.js';
import { QuizAttempt } from '../models/Quiz.js';

class ReportGeneratorService {
  /**
   * Gerar relatório mensal para um aluno
   */
  async generateMonthlyReport(teacherId, studentId, month, year) {
    try {
      const student = await Student.findOne({ _id: studentId, teacher: teacherId })
        .populate('teacher', 'name email phone');

      if (!student) {
        throw new Error('Aluno não encontrado');
      }

      // Buscar dados do período
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const [classes, payments, quizAttempts, courses] = await Promise.all([
        Class.find({
          student: studentId,
          scheduledAt: { $gte: startDate, $lte: endDate }
        }).sort({ scheduledAt: 1 }),
        Payment.find({
          student: studentId,
          month: month.toString(),
          year
        }),
        QuizAttempt.find({
          student: studentId,
          submittedAt: { $gte: startDate, $lte: endDate },
          status: 'graded'
        }).populate('quiz', 'title'),
        Course.find({
          'enrollments.student': studentId,
          'enrollments.status': 'active'
        })
      ]);

      // Calcular estatísticas
      const stats = {
        totalClasses: classes.length,
        completedClasses: classes.filter(c => c.status === 'completed').length,
        cancelledClasses: classes.filter(c => c.status === 'cancelled').length,
        totalHours: classes
          .filter(c => c.status === 'completed')
          .reduce((sum, c) => sum + (c.actualDuration || c.duration || 0), 0) / 60,
        averageScore: quizAttempts.length > 0
          ? quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length
          : 0,
        quizzesCompleted: quizAttempts.length,
        payments: {
          total: payments.length,
          paid: payments.filter(p => p.status === 'paid').length,
          pending: payments.filter(p => p.status === 'pending').length,
          totalAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
        },
        coursesProgress: courses.map(course => {
          const enrollment = course.enrollments.find(e => 
            e.student.toString() === studentId.toString()
          );
          return {
            title: course.title,
            progress: enrollment?.progress || 0,
            completedLessons: enrollment?.completedLessons?.length || 0,
            totalLessons: course.totalLessons
          };
        })
      };

      // Gerar conteúdo do relatório
      const reportContent = this.generateReportHTML(student, stats, classes, quizAttempts, month, year);

      return {
        success: true,
        report: {
          student: {
            name: student.name,
            email: student.email,
            grade: student.grade,
            subject: student.subject
          },
          period: {
            month,
            year,
            monthName: this.getMonthName(month)
          },
          stats,
          classes,
          quizAttempts,
          html: reportContent,
          // TODO: Gerar PDF usando biblioteca como pdfkit ou puppeteer
          pdfUrl: null
        }
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gerar HTML do relatório
   */
  generateReportHTML(student, stats, classes, quizAttempts, month, year) {
    const monthName = this.getMonthName(month);
    
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Mensal - ${student.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; }
    .header h1 { color: #1F2937; margin: 0; }
    .header p { color: #6B7280; margin: 5px 0; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #4F46E5; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px; }
    .stat-card { background: #F9FAFB; padding: 15px; border-radius: 8px; border-left: 4px solid #4F46E5; }
    .stat-card h3 { margin: 0 0 5px 0; color: #1F2937; font-size: 14px; }
    .stat-card p { margin: 0; color: #4F46E5; font-size: 24px; font-weight: bold; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; }
    .table th { background: #F9FAFB; color: #1F2937; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #D1FAE5; color: #065F46; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .badge-danger { background: #FEE2E2; color: #991B1B; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Relatório Mensal de Desempenho</h1>
      <p><strong>${student.name}</strong></p>
      <p>${monthName} de ${year}</p>
      <p>${student.teacher?.name || 'Professor'}</p>
    </div>

    <div class="section">
      <h2>📊 Resumo do Mês</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Aulas Realizadas</h3>
          <p>${stats.completedClasses}/${stats.totalClasses}</p>
        </div>
        <div class="stat-card">
          <h3>Horas de Estudo</h3>
          <p>${stats.totalHours.toFixed(1)}h</p>
        </div>
        <div class="stat-card">
          <h3>Média de Notas</h3>
          <p>${stats.averageScore.toFixed(1)}%</p>
        </div>
        <div class="stat-card">
          <h3>Avaliações</h3>
          <p>${stats.quizzesCompleted}</p>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>📅 Aulas do Mês</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Título</th>
            <th>Duração</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${classes.map(c => `
            <tr>
              <td>${new Date(c.scheduledAt).toLocaleDateString('pt-BR')}</td>
              <td>${c.title}</td>
              <td>${c.actualDuration || c.duration || 0} min</td>
              <td>
                <span class="badge ${
                  c.status === 'completed' ? 'badge-success' :
                  c.status === 'cancelled' ? 'badge-danger' : 'badge-warning'
                }">
                  ${c.status === 'completed' ? 'Concluída' :
                    c.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${quizAttempts.length > 0 ? `
    <div class="section">
      <h2>✅ Avaliações</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Avaliação</th>
            <th>Data</th>
            <th>Nota</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${quizAttempts.map(q => `
            <tr>
              <td>${q.quiz?.title || 'Avaliação'}</td>
              <td>${new Date(q.submittedAt).toLocaleDateString('pt-BR')}</td>
              <td>${q.percentage.toFixed(1)}%</td>
              <td>
                <span class="badge ${
                  q.percentage >= 70 ? 'badge-success' :
                  q.percentage >= 50 ? 'badge-warning' : 'badge-danger'
                }">
                  ${q.grade || 'N/A'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="section">
      <h2>💰 Situação Financeira</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Pagamentos Realizados</h3>
          <p>${stats.payments.paid}/${stats.payments.total}</p>
        </div>
        <div class="stat-card">
          <h3>Total Pago</h3>
          <p>R$ ${stats.payments.totalAmount.toFixed(2)}</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Relatório gerado automaticamente pelo Nexus Academy</p>
      <p>Para dúvidas, entre em contato com ${student.teacher?.email || 'o professor'}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Enviar relatório por email
   */
  async sendReportByEmail(teacherId, studentId, month, year, recipientEmail) {
    try {
      const report = await this.generateMonthlyReport(teacherId, studentId, month, year);
      
      if (!report.success) {
        return report;
      }

      // Integrar com serviço de email
      const emailService = (await import('./emailService.js')).default;
      const pdfService = (await import('./pdfService.js')).default;
      
      // Gerar PDF
      let pdfAttachment = null;
      if (report.report) {
        const pdfResult = await pdfService.generateMonthlyReportPDF(report.report);
        if (pdfResult && pdfResult.filepath) {
          pdfAttachment = [{ path: pdfResult.filepath, filename: pdfResult.filename }];
        }
      }

      await emailService.sendEmail({
        to: recipientEmail,
        subject: `Relatório Mensal - ${report.report.student.name} - ${report.report.period.monthName}/${year}`,
        html: report.report.html,
        attachments: pdfAttachment || []
      });

      return {
        success: true,
        message: 'Relatório enviado por email',
        report: report.report
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter nome do mês
   */
  getMonthName(month) {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1] || '';
  }
}

export default new ReportGeneratorService();

