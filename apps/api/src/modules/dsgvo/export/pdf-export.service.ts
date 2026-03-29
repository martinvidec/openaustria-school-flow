import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface PersonExportData {
  exportDate: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    dateOfBirth?: string | null;
    personType: string;
  };
  role: 'TEACHER' | 'STUDENT' | 'PARENT';
  roleData: Record<string, unknown>;
  consents: Array<{
    purpose: string;
    granted: boolean;
    grantedAt?: string | null;
    withdrawnAt?: string | null;
  }>;
  auditLog: Array<{
    action: string;
    resource: string;
    createdAt: string;
  }>;
  schoolName?: string;
}

@Injectable()
export class PdfExportService {
  async generatePersonDataPdf(exportData: PersonExportData): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // Title
        doc.fontSize(18).text('Datenauskunft nach Art. 15 DSGVO', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Erstellt am: ${exportData.exportDate}`, { align: 'center' });
        doc.moveDown(1.5);

        // Section: Persoenliche Daten
        this.addSectionHeader(doc, 'Persoenliche Daten');
        this.addField(doc, 'Name', `${exportData.person.firstName} ${exportData.person.lastName}`);
        if (exportData.person.email) this.addField(doc, 'E-Mail', exportData.person.email);
        if (exportData.person.phone) this.addField(doc, 'Telefon', exportData.person.phone);
        if (exportData.person.address) this.addField(doc, 'Adresse', exportData.person.address);
        if (exportData.person.dateOfBirth) this.addField(doc, 'Geburtsdatum', exportData.person.dateOfBirth);
        this.addField(doc, 'Personentyp', exportData.person.personType);
        doc.moveDown(1);

        // Section: Rolle und Zuordnung
        this.addSectionHeader(doc, 'Rolle und Zuordnung');
        this.addField(doc, 'Rolle', exportData.role);
        for (const [key, value] of Object.entries(exportData.roleData)) {
          if (value !== null && value !== undefined) {
            this.addField(doc, key, String(value));
          }
        }
        doc.moveDown(1);

        // Section: Einwilligungen
        this.addSectionHeader(doc, 'Einwilligungen');
        if (exportData.consents.length === 0) {
          doc.fontSize(10).text('Keine Einwilligungen erfasst.');
        } else {
          for (const consent of exportData.consents) {
            const status = consent.granted ? 'Erteilt' : 'Nicht erteilt';
            const date = consent.grantedAt ? ` (${consent.grantedAt})` : '';
            const withdrawn = consent.withdrawnAt ? ` - Widerrufen am ${consent.withdrawnAt}` : '';
            doc.fontSize(10).text(`${consent.purpose}: ${status}${date}${withdrawn}`);
          }
        }
        doc.moveDown(1);

        // Section: Datenverarbeitungshistorie
        this.addSectionHeader(doc, 'Datenverarbeitungshistorie');
        if (exportData.auditLog.length === 0) {
          doc.fontSize(10).text('Keine Eintraege vorhanden.');
        } else {
          const recentEntries = exportData.auditLog.slice(0, 50); // Limit to 50 most recent
          for (const entry of recentEntries) {
            doc.fontSize(9).text(`${entry.createdAt} - ${entry.action} ${entry.resource}`);
          }
          if (exportData.auditLog.length > 50) {
            doc.fontSize(9).text(`... und ${exportData.auditLog.length - 50} weitere Eintraege`);
          }
        }
        doc.moveDown(1);

        // Footer
        doc.fontSize(8)
          .text('---', { align: 'center' })
          .text(
            `Export erstellt am ${exportData.exportDate}${exportData.schoolName ? ` | ${exportData.schoolName}` : ''}`,
            { align: 'center' },
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private addSectionHeader(doc: PDFKit.PDFDocument, title: string) {
    doc.fontSize(14).text(title, { underline: true });
    doc.moveDown(0.5);
  }

  private addField(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.fontSize(10).text(`${label}: ${value}`);
  }
}
