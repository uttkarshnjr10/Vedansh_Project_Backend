import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { NotificationEntity } from './entities/notification.entity';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([NotificationEntity])],
    controllers: [NotificationsController],
    providers: [EmailService, SmsService, NotificationService],
    exports: [EmailService, SmsService, NotificationService],
})
export class NotificationsModule { }
