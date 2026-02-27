import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private readonly isDev: boolean;

    constructor(private readonly configService: ConfigService) {
        this.isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    }

    async sendSMS(phone: string, message: string): Promise<void> {
        if (this.isDev) {
            this.logger.debug(`SMS (dev): to=${phone} message="${message}"`);
            return;
        }

        // Production: MSG91 HTTP API
        const authKey = this.configService.get<string>('MSG91_AUTH_KEY');
        const senderId = this.configService.get<string>('MSG91_SENDER_ID', 'VANAUS');

        if (!authKey) {
            this.logger.warn('MSG91 auth key not configured');
            return;
        }

        try {
            const url = 'https://api.msg91.com/api/v5/flow/';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'authkey': authKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: senderId,
                    route: '4',
                    country: '91',
                    sms: [{ message, to: [phone] }],
                }),
            });

            if (!response.ok) {
                this.logger.error(`SMS failed: ${response.statusText}`);
            } else {
                this.logger.log(`SMS sent: to=${phone}`);
            }
        } catch (error: any) {
            this.logger.error(`SMS send failed: ${error?.message}`);
        }
    }

    async sendOTPSms(phone: string, otp: string): Promise<void> {
        const message = `Your VanaAushadhi verification code is ${otp}. Valid for 5 minutes. Do not share.`;
        await this.sendSMS(phone, message);
    }
}
