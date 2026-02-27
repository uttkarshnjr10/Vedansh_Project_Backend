import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../../notifications/email.service';
import { PAYOUT_QUEUE } from '../queue.constants';

@Processor(PAYOUT_QUEUE)
export class PayoutProcessor {
    private readonly logger = new Logger(PayoutProcessor.name);

    constructor(private readonly emailService: EmailService) { }

    @Process('process-payout')
    async handleProcessPayout(job: Job<{ payoutId: string; sellerId: string }>) {
        try {
            // TODO: call PayoutService.processPayoutViaRazorpayX when fully implemented
            this.logger.log(`Processing payout ${job.data.payoutId} for seller ${job.data.sellerId}`);
        } catch (error: any) {
            this.logger.error(`Payout processing failed: ${error?.message}`);
        }
    }

    @Process('payout-completed')
    async handlePayoutCompleted(
        job: Job<{ sellerEmail: string; sellerName: string; amount: number; bankName: string; periodStart: string; periodEnd: string }>,
    ) {
        try {
            await this.emailService.sendEmail(job.data.sellerEmail, 'Payout Processed - VanaAushadhi', 'seller-payout', {
                sellerName: job.data.sellerName,
                amount: job.data.amount,
                bankName: job.data.bankName,
                periodStart: job.data.periodStart,
                periodEnd: job.data.periodEnd,
            });
        } catch (error: any) {
            this.logger.error(`Payout completed notification failed: ${error?.message}`);
        }
    }

    @Process('payout-failed')
    async handlePayoutFailed(job: Job<{ payoutId: string; sellerId: string; reason: string }>) {
        this.logger.error(`PAYOUT FAILED: ${job.data.payoutId} for seller ${job.data.sellerId}. Reason: ${job.data.reason}. Will retry next day.`);
    }
}
