import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { SellerEntity } from './entities/seller.entity';
import { SellerDocumentEntity, DocumentStatus } from './entities/seller-document.entity';
import { PayoutEntity } from './entities/payout.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { BankDetailsDto } from './dto/bank-details.dto';
import { AdminApproveSellerDto, AdminSellerAction } from './dto/admin-approve-seller.dto';
import { FileUploadService } from '../../shared/file-upload.service';
import { ROLES, SELLER_STATUS, DOCUMENT_TYPE, PRODUCT_STATUS } from '../../common/constants';
import { encryptSensitive } from '../../common/utils/crypto.util';

@Injectable()
export class SellersService {
    private readonly logger = new Logger(SellersService.name);

    constructor(
        @InjectRepository(SellerEntity)
        private readonly sellerRepository: Repository<SellerEntity>,
        @InjectRepository(SellerDocumentEntity)
        private readonly documentRepository: Repository<SellerDocumentEntity>,
        @InjectRepository(PayoutEntity)
        private readonly payoutRepository: Repository<PayoutEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
        private readonly fileUploadService: FileUploadService,
        private readonly configService: ConfigService,
    ) { }

    // ─── REGISTER ─────────────────────────────

    async registerSeller(
        userId: string,
        registerDto: RegisterSellerDto,
    ): Promise<SellerEntity> {
        // Check if user already has a seller profile
        const existing = await this.sellerRepository.findOne({
            where: { userId },
        });
        if (existing) {
            throw new ConflictException('You already have a seller profile');
        }

        const defaultCommission = this.configService.get<number>(
            'DEFAULT_COMMISSION_RATE',
            15,
        );

        // Encrypt sensitive fields
        let encryptedPan: string | null = null;
        if (registerDto.panNumber) {
            const key = this.configService.get<string>('ENCRYPTION_KEY', 'default-enc-key');
            encryptedPan = encryptSensitive(registerDto.panNumber, key);
        }

        const seller = this.sellerRepository.create({
            userId,
            brandName: registerDto.brandName,
            businessType: registerDto.businessType,
            gstNumber: registerDto.gstNumber ?? null,
            panNumber: encryptedPan,
            fssaiLicenseNumber: registerDto.fssaiLicenseNumber ?? null,
            businessAddress: registerDto.businessAddress ?? null,
            state: registerDto.state,
            aboutBrand: registerDto.aboutBrand ?? null,
            commissionRate: defaultCommission,
            status: SELLER_STATUS.PENDING_VERIFICATION,
        });

        const savedSeller = await this.sellerRepository.save(seller);

        // Update user role to SELLER
        await this.userRepository.update(userId, { role: ROLES.SELLER });

        this.logger.log(`New seller registered: ${savedSeller.brandName} (${savedSeller.id})`);

        // TODO: Notify admin team via queue (Phase 10)

        return savedSeller;
    }

    // ─── UPDATE PROFILE ───────────────────────

    async updateProfile(
        sellerId: string,
        updateDto: UpdateSellerDto,
    ): Promise<SellerEntity> {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
        });
        if (!seller) throw new NotFoundException('Seller profile not found');

        Object.assign(seller, updateDto);
        return this.sellerRepository.save(seller);
    }

    // ─── BANK DETAILS ────────────────────────

    async updateBankDetails(
        sellerId: string,
        bankDto: BankDetailsDto,
    ): Promise<SellerEntity> {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
        });
        if (!seller) throw new NotFoundException('Seller profile not found');

        const key = this.configService.get<string>('ENCRYPTION_KEY', 'default-enc-key');

        seller.bankAccountName = bankDto.bankAccountName;
        seller.bankAccountNumber = encryptSensitive(bankDto.bankAccountNumber, key);
        seller.bankIfscCode = bankDto.bankIfscCode;
        seller.bankName = bankDto.bankName;

        this.logger.log(`Bank details updated for seller: ${sellerId}`);

        return this.sellerRepository.save(seller);
    }

    // ─── UPLOAD DOCUMENT ──────────────────────

    async uploadDocument(
        sellerId: string,
        file: Express.Multer.File,
        documentType: DOCUMENT_TYPE,
    ): Promise<SellerDocumentEntity> {
        // Validate file
        this.fileUploadService.validateUpload(file, {
            allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
            maxMB: 10,
        });

        // Upload to storage
        const result = await this.fileUploadService.uploadFile(
            file,
            `sellers/${sellerId}/documents`,
        );

        // Save document entity
        const doc = this.documentRepository.create({
            sellerId,
            documentType,
            fileUrl: result.url,
            fileName: file.originalname,
            fileSizeBytes: file.size,
            mimeType: file.mimetype,
            status: DocumentStatus.PENDING,
        });

        this.logger.log(
            `Document uploaded for seller ${sellerId}: ${documentType} (${file.originalname})`,
        );

        return this.documentRepository.save(doc);
    }

    // ─── ADMIN APPROVE/REJECT ─────────────────

    async adminApproveSeller(
        sellerId: string,
        adminId: string,
        approveDto: AdminApproveSellerDto,
    ): Promise<SellerEntity> {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
        });
        if (!seller) throw new NotFoundException('Seller not found');

        switch (approveDto.action) {
            case AdminSellerAction.APPROVE:
                seller.status = SELLER_STATUS.APPROVED;
                seller.approvedAt = new Date();
                seller.approvedBy = adminId;
                seller.rejectionReason = null;
                if (approveDto.commissionRate != null) {
                    seller.commissionRate = approveDto.commissionRate;
                }
                if (approveDto.assignVerifiedBadge) {
                    seller.isVerifiedBadge = true;
                }
                break;

            case AdminSellerAction.REJECT:
                seller.status = SELLER_STATUS.REJECTED;
                seller.rejectionReason = approveDto.rejectionReason ?? 'No reason provided';
                break;

            case AdminSellerAction.SUSPEND:
                seller.status = SELLER_STATUS.SUSPENDED;
                seller.rejectionReason = approveDto.rejectionReason ?? 'Account suspended';
                break;
        }

        this.logger.log(
            `Admin ${adminId} ${approveDto.action}d seller ${sellerId}`,
        );

        // TODO: Notify seller via queue (Phase 10)

        return this.sellerRepository.save(seller);
    }

    // ─── SELLER DASHBOARD ─────────────────────

    async getSellerDashboard(sellerId: string): Promise<any> {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
            select: [
                'id', 'brandName', 'status', 'isVerifiedBadge', 'avgRating',
                'totalEarnings', 'pendingPayout', 'commissionRate', 'logoUrl',
            ],
        });
        if (!seller) throw new NotFoundException('Seller not found');

        // Product stats
        const totalProducts = await this.productRepository.count({
            where: { sellerId },
        });
        const activeProducts = await this.productRepository.count({
            where: { sellerId, status: PRODUCT_STATUS.APPROVED },
        });
        const pendingProducts = await this.productRepository.count({
            where: { sellerId, status: PRODUCT_STATUS.PENDING },
        });

        // Monthly revenue (current month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // TODO: Calculate from order_items when Orders module is built (Phase 5)

        return {
            seller,
            stats: {
                totalProducts,
                activeProducts,
                pendingProducts,
                totalOrders: 0,          // TODO: Phase 5
                ordersThisMonth: 0,      // TODO: Phase 5
                revenueThisMonth: 0,     // TODO: Phase 5
                pendingPayout: seller.pendingPayout,
                avgRating: seller.avgRating,
            },
            recentOrders: [],          // TODO: Phase 5
        };
    }

    // ─── GET SELLER PROFILE ───────────────────

    async getSellerProfile(sellerId: string): Promise<SellerEntity> {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
            relations: ['user'],
        });
        if (!seller) throw new NotFoundException('Seller not found');
        return seller;
    }

    async getSellerByUserId(userId: string): Promise<SellerEntity> {
        const seller = await this.sellerRepository.findOne({
            where: { userId },
        });
        if (!seller) throw new NotFoundException('No seller profile found');
        return seller;
    }

    // ─── PUBLIC STOREFRONT ────────────────────

    async getPublicProfile(sellerId: string): Promise<any> {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId, status: SELLER_STATUS.APPROVED },
            select: [
                'id', 'brandName', 'aboutBrand', 'logoUrl', 'avgRating',
                'totalProductsSold', 'isVerifiedBadge', 'createdAt',
            ],
        });
        if (!seller) throw new NotFoundException('Seller not found');
        return seller;
    }

    async getSellerPublicProducts(
        sellerId: string,
        page = 1,
        limit = 20,
    ): Promise<{
        items: ProductEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const [items, totalItems] = await this.productRepository.findAndCount({
            where: { sellerId, status: PRODUCT_STATUS.APPROVED },
            relations: ['category'],
            order: { salesCount: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    // ─── SELLER PRODUCTS/ORDERS/PAYOUTS ───────

    async getSellerProducts(
        sellerId: string,
        page = 1,
        limit = 20,
        status?: string,
    ): Promise<{
        items: ProductEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const where: any = { sellerId };
        if (status) where.status = status;

        const [items, totalItems] = await this.productRepository.findAndCount({
            where,
            relations: ['category', 'subcategory'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    async getSellerPayouts(
        sellerId: string,
        page = 1,
        limit = 20,
    ): Promise<{
        items: PayoutEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const [items, totalItems] = await this.payoutRepository.findAndCount({
            where: { sellerId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    // ─── ADMIN: LIST SELLERS ──────────────────

    async adminListSellers(
        page = 1,
        limit = 20,
        status?: string,
        search?: string,
    ): Promise<{
        items: SellerEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const qb = this.sellerRepository.createQueryBuilder('seller')
            .leftJoinAndSelect('seller.user', 'user');

        if (status) {
            qb.andWhere('seller.status = :status', { status });
        }
        if (search) {
            qb.andWhere(
                '(seller.brandName ILIKE :search OR seller.gstNumber ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        qb.orderBy('seller.createdAt', 'DESC');

        const totalItems = await qb.getCount();
        const items = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    async adminGetPendingSellers(page = 1, limit = 20): Promise<{
        items: SellerEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const [items, totalItems] = await this.sellerRepository.findAndCount({
            where: { status: SELLER_STATUS.PENDING_VERIFICATION },
            relations: ['user'],
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    async adminGetSellerDetails(sellerId: string): Promise<{ seller: SellerEntity; documents: SellerDocumentEntity[] }> {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
            relations: ['user'],
        });
        if (!seller) throw new NotFoundException('Seller not found');

        const documents = await this.documentRepository.find({
            where: { sellerId },
            order: { createdAt: 'DESC' },
        });

        return { seller, documents };
    }

    async adminUpdateCommission(
        sellerId: string,
        commissionRate: number,
    ): Promise<SellerEntity> {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
        });
        if (!seller) throw new NotFoundException('Seller not found');
        seller.commissionRate = commissionRate;
        return this.sellerRepository.save(seller);
    }
}
