import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../../notifications/email.service';
import { SmsService } from '../../notifications/sms.service';
import { NotificationService } from '../../notifications/notification.service';
import { NOTIFICATION_QUEUE } from '../queue.constants';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(
        private readonly emailService: EmailService,
        private readonly smsService: SmsService,
        private readonly notificationService: NotificationService,
    ) { }

    @Process('send-email')
    async handleSendEmail(job: Job<{ to: string; subject: string; template: string; context: Record<string, any> }>) {
        try {
            await this.emailService.sendEmail(
                job.data.to,
                job.data.subject,
                job.data.template,
                job.data.context,
            );
        } catch (error: any) {
            this.logger.error(`Email job failed: ${error?.message}`);
        }
    }

    @Process('send-sms')
    async handleSendSms(job: Job<{ phone: string; message: string }>) {
        try {
            await this.smsService.sendSMS(job.data.phone, job.data.message);
        } catch (error: any) {
            this.logger.error(`SMS job failed: ${error?.message}`);
        }
    }

    @Process('create-notification')
    async handleCreateNotification(
        job: Job<{ userId: string; type: any; title: string; message: string; data?: Record<string, any> }>,
    ) {
        try {
            await this.notificationService.createNotification(
                job.data.userId,
                job.data.type,
                job.data.title,
                job.data.message,
                job.data.data,
            );
        } catch (error: any) {
            this.logger.error(`Notification job failed: ${error?.message}`);
        }
    }
}
