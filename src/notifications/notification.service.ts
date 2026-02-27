import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NOTIFICATION_TYPE } from '../common/constants';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(NotificationEntity)
        private readonly notificationRepository: Repository<NotificationEntity>,
    ) { }

    async createNotification(
        userId: string,
        type: NOTIFICATION_TYPE,
        title: string,
        message: string,
        data?: Record<string, any>,
    ): Promise<NotificationEntity> {
        const notification = this.notificationRepository.create({
            userId,
            type,
            title,
            message,
            data: data ?? null,
        });
        const saved = await this.notificationRepository.save(notification);
        this.logger.debug(`Notification created: ${type} for user ${userId}`);
        return saved;
    }

    async getUserNotifications(
        userId: string,
        page = 1,
        limit = 20,
    ): Promise<{
        items: NotificationEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
        unreadCount: number;
    }> {
        const [items, totalItems] = await this.notificationRepository.findAndCount({
            where: { userId },
            order: { isRead: 'ASC', createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        const unreadCount = await this.notificationRepository.count({
            where: { userId, isRead: false },
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
            unreadCount,
        };
    }

    async markAsRead(userId: string, notificationId: string): Promise<void> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId, userId },
        });
        if (!notification) throw new NotFoundException('Notification not found');

        notification.isRead = true;
        notification.readAt = new Date();
        await this.notificationRepository.save(notification);
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationRepository.update(
            { userId, isRead: false },
            { isRead: true, readAt: new Date() },
        );
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationRepository.count({
            where: { userId, isRead: false },
        });
    }
}
