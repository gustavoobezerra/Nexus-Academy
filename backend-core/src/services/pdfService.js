/**
 * Serviço de Geração de PDF
 * Gera PDFs para certificados e relatórios
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PDFService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../uploads/certificates');
    this.ensureDirectoryExists(this.outputDir);
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Gerar PDF de certificado
   */
  async generateCertificate(certificate, student, teacher, course) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `certificate_${certificate._id}.pdf`;
        const filepath = path.join(this.outputDir, filename);

        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Background
        doc.rect(0, 0, doc.page.width, doc.page.height)
          .fill('#F8F9FA');

        // Border
        doc.strokeColor('#4F46E5')
          .lineWidth(10)
          .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
          .stroke();

        // Title
        doc.fontSize(36)
          .fillColor('#1F2937')
          .font('Helvetica-Bold')
          .text('CERTIFICADO', 0, 100, { align: 'center' });

        // Subtitle
        doc.fontSize(18)
          .fillColor('#6B7280')
          .font('Helvetica')
          .text('de Conclusão', 0, 150, { align: 'center' });

        // Student name
        doc.fontSize(28)
          .fillColor('#1F2937')
          .font('Helvetica-Bold')
          .text(student.name, 0, 220, { align: 'center' });

        // Certificate text
        doc.fontSize(14)
          .fillColor('#4B5563')
          .font('Helvetica')
          .text(
            `concluiu com sucesso o curso de ${course?.title || certificate.title}`,
            0,
            280,
            { align: 'center', width: doc.page.width - 100 }
          );

        // Date
        doc.fontSize(12)
          .fillColor('#6B7280')
          .text(
            `Emitido em ${new Date(certificate.issueDate).toLocaleDateString('pt-BR')}`,
            0,
            350,
            { align: 'center' }
          );

        // Certificate number
        doc.fontSize(10)
          .fillColor('#9CA3AF')
          .text(
            `Certificado Nº: ${certificate.certificateNumber}`,
            0,
            380,
            { align: 'center' }
          );

        // Verification code
        doc.fontSize(9)
          .fillColor('#9CA3AF')
          .text(
            `Código de Verificação: ${certificate.verificationCode}`,
            0,
            400,
            { align: 'center' }
          );

        // Teacher signature area
        doc.fontSize(12)
          .fillColor('#4B5563')
          .text(
            teacher?.name || 'Professor',
            doc.page.width / 2 - 150,
            doc.page.height - 120,
            { width: 300, align: 'center' }
          );

        doc.moveTo(doc.page.width / 2 - 100, doc.page.height - 100)
          .lineTo(doc.page.width / 2 + 100, doc.page.height - 100)
          .strokeColor('#4F46E5')
          .lineWidth(1)
          .stroke();

        doc.fontSize(10)
          .fillColor('#6B7280')
          .text('Professor', doc.page.width / 2 - 150, doc.page.height - 80, {
            width: 300,
            align: 'center'
          });

        doc.end();

        stream.on('finish', () => {
          resolve({
            filename,
            filepath,
            url: `/uploads/certificates/${filename}`
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Gerar PDF de relatório mensal
   */
  async generateMonthlyReportPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `report_${reportData.student.name}_${reportData.period.month}_${reportData.period.year}.pdf`;
        const filepath = path.join(this.outputDir.replace('certificates', 'reports'), filename);
        
        // Criar diretório se não existir
        const reportsDir = path.dirname(filepath);
        this.ensureDirectoryExists(reportsDir);

        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24)
          .fillColor('#1F2937')
          .font('Helvetica-Bold')
          .text('Relatório Mensal de Desempenho', 0, 50, { align: 'center' });

        doc.fontSize(14)
          .fillColor('#6B7280')
          .font('Helvetica')
          .text(
            `${reportData.student.name} - ${reportData.period.monthName} de ${reportData.period.year}`,
            0,
            80,
            { align: 'center' }
          );

        // Stats section
        let yPos = 130;
        doc.fontSize(16)
          .fillColor('#4F46E5')
          .font('Helvetica-Bold')
          .text('Resumo do Mês', 50, yPos);

        yPos += 30;
        const stats = reportData.stats;
        const statsData = [
          ['Aulas Realizadas', `${stats.completedClasses}/${stats.totalClasses}`],
          ['Horas de Estudo', `${stats.totalHours.toFixed(1)}h`],
          ['Média de Notas', `${stats.averageScore.toFixed(1)}%`],
          ['Avaliações', `${stats.quizzesCompleted}`]
        ];

        statsData.forEach(([label, value]) => {
          doc.fontSize(12)
            .fillColor('#4B5563')
            .font('Helvetica')
            .text(label + ':', 50, yPos);
          
          doc.fontSize(14)
            .fillColor('#1F2937')
            .font('Helvetica-Bold')
            .text(value, 200, yPos);
          
          yPos += 25;
        });

        // Classes section
        if (reportData.classes && reportData.classes.length > 0) {
          yPos += 20;
          doc.fontSize(16)
            .fillColor('#4F46E5')
            .font('Helvetica-Bold')
            .text('Aulas do Mês', 50, yPos);

          yPos += 25;
          doc.fontSize(10)
            .fillColor('#6B7280')
            .font('Helvetica')
            .text('Data', 50, yPos)
            .text('Título', 150, yPos)
            .text('Duração', 400, yPos)
            .text('Status', 480, yPos);

          yPos += 20;
          reportData.classes.slice(0, 10).forEach(c => {
            if (yPos > doc.page.height - 100) {
              doc.addPage();
              yPos = 50;
            }

            doc.fontSize(9)
              .fillColor('#1F2937')
              .font('Helvetica')
              .text(
                new Date(c.scheduledAt).toLocaleDateString('pt-BR'),
                50,
                yPos
              )
              .text(c.title || 'Aula', 150, yPos, { width: 240 })
              .text(`${c.actualDuration || c.duration || 0} min`, 400, yPos)
              .text(
                c.status === 'completed' ? 'Concluída' :
                c.status === 'cancelled' ? 'Cancelada' : 'Agendada',
                480,
                yPos
              );

            yPos += 20;
          });
        }

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
            .fillColor('#9CA3AF')
            .text(
              `Página ${i + 1} de ${pageCount} - Relatório gerado automaticamente pelo Nexus Academy`,
              50,
              doc.page.height - 30,
              { align: 'center', width: doc.page.width - 100 }
            );
        }

        doc.end();

        stream.on('finish', () => {
          resolve({
            filename,
            filepath,
            url: `/uploads/reports/${filename}`
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new PDFService();

