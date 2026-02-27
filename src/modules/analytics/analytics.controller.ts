import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';

@ApiTags('Admin - Analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminAnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'Admin dashboard stats (today, month, all time, charts)' })
    async getDashboard() {
        return this.analyticsService.getAdminDashboardStats();
    }
}

@ApiTags('Seller - Analytics')
@Controller('sellers/my/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SellerAnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get()
    @ApiOperation({ summary: 'Seller analytics (revenue, top products)' })
    async getSellerAnalytics(
        @CurrentUser('id') userId: string,
        @Query('period') period: 'week' | 'month' | 'year' = 'month',
    ) {
        // Note: userId here is the user ID, not seller ID
        // In production, look up seller by userId first
        return this.analyticsService.getSellerAnalytics(userId, period);
    }
}
