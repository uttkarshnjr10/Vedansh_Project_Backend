import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class LoyaltyService {
    private readonly logger = new Logger(LoyaltyService.name);

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private readonly configService: ConfigService,
    ) { }

    private get pointsPerRupee(): number {
        return this.configService.get<number>('POINTS_PER_RUPEE', 10);
    }

    private get minPointsRedeem(): number {
        return this.configService.get<number>('MIN_POINTS_REDEEM', 100);
    }

    private get maxPointsDiscountPercent(): number {
        return 0.10; // max 10% of cart can be paid by points
    }

    async getWalletAndPoints(userId: string): Promise<{
        walletBalance: number;
        loyaltyPoints: number;
        pointsValue: number;
    }> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'walletBalance', 'loyaltyPoints'],
        });
        if (!user) throw new BadRequestException('User not found');

        const pointsValue = user.loyaltyPoints / this.pointsPerRupee;

        return {
            walletBalance: Number(user.walletBalance),
            loyaltyPoints: user.loyaltyPoints,
            pointsValue: Math.round(pointsValue * 100) / 100,
        };
    }

    async calculateLoyaltyDiscount(
        userId: string,
        pointsToRedeem: number,
        cartTotal: number,
    ): Promise<{ pointsValue: number; finalTotal: number }> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'loyaltyPoints'],
        });
        if (!user) throw new BadRequestException('User not found');

        // Validate user has enough points
        if (user.loyaltyPoints < pointsToRedeem) {
            throw new BadRequestException(
                `You only have ${user.loyaltyPoints} points available`,
            );
        }

        // Validate minimum redemption
        if (pointsToRedeem < this.minPointsRedeem) {
            throw new BadRequestException(
                `Minimum ${this.minPointsRedeem} points required for redemption`,
            );
        }

        // Calculate rupee value
        let pointsValue = pointsToRedeem / this.pointsPerRupee;

        // Cap at 10% of cart total
        const maxDiscount = cartTotal * this.maxPointsDiscountPercent;
        if (pointsValue > maxDiscount) {
            pointsValue = maxDiscount;
        }

        pointsValue = Math.round(pointsValue * 100) / 100;
        const finalTotal = Math.max(0, cartTotal - pointsValue);

        return { pointsValue, finalTotal };
    }

    async creditLoyaltyPoints(
        userId: string,
        _orderId: string,
        orderAmount: number,
    ): Promise<void> {
        // Credit 1 point per rupee spent
        const pointsToCredit = Math.floor(orderAmount);

        await this.userRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({ loyaltyPoints: () => `"loyaltyPoints" + ${pointsToCredit}` })
            .where('id = :id', { id: userId })
            .execute();

        this.logger.log(
            `Credited ${pointsToCredit} loyalty points to user ${userId}`,
        );
    }

    async deductLoyaltyPoints(
        userId: string,
        pointsToDeduct: number,
    ): Promise<void> {
        const result = await this.userRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({ loyaltyPoints: () => `"loyaltyPoints" - ${pointsToDeduct}` })
            .where('id = :id AND "loyaltyPoints" >= :points', {
                id: userId,
                points: pointsToDeduct,
            })
            .execute();

        if (result.affected === 0) {
            throw new BadRequestException('Insufficient loyalty points');
        }
    }
}
