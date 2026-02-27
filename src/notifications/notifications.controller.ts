import {
    Controller,
    Get,
    Patch,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get my notifications (paginated, unread first)' })
    async getNotifications(
        @CurrentUser('id') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.notificationService.getUserNotifications(userId, +page, +limit);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notification count' })
    async getUnreadCount(@CurrentUser('id') userId: string) {
        const count = await this.notificationService.getUnreadCount(userId);
        return { unreadCount: count };
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    async markAsRead(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        await this.notificationService.markAsRead(userId, id);
        return { message: 'Notification marked as read' };
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    async markAllAsRead(@CurrentUser('id') userId: string) {
        await this.notificationService.markAllAsRead(userId);
        return { message: 'All notifications marked as read' };
    }
}
