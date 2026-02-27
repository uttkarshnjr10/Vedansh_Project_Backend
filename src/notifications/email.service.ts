import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;
    private templateCache = new Map<string, handlebars.TemplateDelegate>();

    constructor(private readonly configService: ConfigService) {
        const smtpHost = this.configService.get<string>('SMTP_HOST');
        const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
        const smtpUser = this.configService.get<string>('SMTP_USER');
        const smtpPass = this.configService.get<string>('SMTP_PASS');

        if (smtpHost && smtpUser) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: smtpUser, pass: smtpPass },
            });
            this.logger.log(`Email transporter configured: ${smtpHost}`);
        } else {
            // Dev fallback: log emails to console
            this.transporter = nodemailer.createTransport({
                jsonTransport: true,
            });
            this.logger.warn('Email: using console transport (no SMTP configured)');
        }
    }

    private getTemplate(templateName: string): handlebars.TemplateDelegate {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName)!;
        }

        const templatePath = path.join(
            __dirname,
            'templates',
            `${templateName}.hbs`,
        );

        try {
            const source = fs.readFileSync(templatePath, 'utf-8');
            const compiled = handlebars.compile(source);
            this.templateCache.set(templateName, compiled);
            return compiled;
        } catch {
            this.logger.error(`Template not found: ${templateName}`);
            // Fallback to plain text
            return handlebars.compile('<p>{{message}}</p>');
        }
    }

    async sendEmail(
        to: string,
        subject: string,
        templateName: string,
        context: Record<string, any>,
    ): Promise<void> {
        try {
            const template = this.getTemplate(templateName);
            const html = template(context);
            const fromAddress = this.configService.get<string>(
                'EMAIL_FROM',
                'noreply@vanaaushadhi.com',
            );

            const result = await this.transporter.sendMail({
                from: `VanaAushadhi <${fromAddress}>`,
                to,
                subject,
                html,
            });

            if (result.message) {
                // jsonTransport mode — log to console in dev
                this.logger.debug(`Email (dev): to=${to} subject="${subject}"`);
            } else {
                this.logger.log(`Email sent: to=${to} subject="${subject}"`);
            }
        } catch (error: any) {
            this.logger.error(`Email send failed: ${error?.message}`);
            // Never throw — email failure shouldn't crash the app
        }
    }

    async sendBulkEmails(
        recipients: Array<{ email: string; context: Record<string, any> }>,
        subject: string,
        templateName: string,
    ): Promise<void> {
        const BATCH_SIZE = 50;
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(
                batch.map((r) =>
                    this.sendEmail(r.email, subject, templateName, r.context),
                ),
            );
            // Rate limit: wait 1s between batches (SES limit ~50/s)
            if (i + BATCH_SIZE < recipients.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }
}
