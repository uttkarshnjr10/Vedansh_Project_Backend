import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ProductReviewDto } from './dto/product-review.dto';
import { AdminApproveProductDto } from './dto/admin-approve-product.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES } from '../../common/constants';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // ─── PUBLIC ENDPOINTS ─────────────────────

    @Public()
    @Get()
    @ApiOperation({ summary: 'List products with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Paginated product list' })
    async findAll(@Query() filterDto: ProductFilterDto) {
        return this.productsService.findAll(filterDto);
    }

    @Public()
    @Get('search')
    @ApiOperation({ summary: 'Search products' })
    @ApiQuery({ name: 'q', required: false })
    @ApiQuery({ name: 'category', required: false })
    async search(
        @Query('q') q?: string,
        @Query('category') category?: string,
        @Query() filterDto?: ProductFilterDto,
    ) {
        return this.productsService.findAll({
            ...filterDto,
            search: q,
            categoryId: category,
        } as ProductFilterDto);
    }

    @Public()
    @Get(':slug')
    @ApiOperation({ summary: 'Get product detail by slug' })
    @ApiResponse({ status: 200, description: 'Product detail with images, certificates, and reviews' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async findBySlug(@Param('slug') slug: string) {
        return this.productsService.findBySlug(slug);
    }

    @Public()
    @Get(':slug/reviews')
    @ApiOperation({ summary: 'Get product reviews' })
    async getReviews(
        @Param('slug') slug: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        const product = await this.productsService.findBySlug(slug);
        return this.productsService.getProductReviews(product.id, +page, +limit);
    }

    @Public()
    @Get(':slug/related')
    @ApiOperation({ summary: 'Get related products' })
    async getRelated(@Param('slug') slug: string) {
        const product = await this.productsService.findBySlug(slug);
        return this.productsService.findRelatedProducts(product.id);
    }

    // ─── AUTHENTICATED ENDPOINTS ──────────────

    @Post(':id/reviews')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.BUYER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Submit a product review (buyers only)' })
    @ApiResponse({ status: 201, description: 'Review submitted' })
    async addReview(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) productId: string,
        @Body() reviewDto: ProductReviewDto,
    ) {
        return this.productsService.addReview(userId, productId, reviewDto);
    }

    @Post(':id/wishlist')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Add product to wishlist' })
    async addToWishlist(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) productId: string,
    ) {
        return this.productsService.addToWishlist(userId, productId);
    }

    @Delete(':id/wishlist')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Remove product from wishlist' })
    async removeFromWishlist(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) productId: string,
    ) {
        await this.productsService.removeFromWishlist(userId, productId);
        return { message: 'Removed from wishlist' };
    }

    @Get('user/wishlist')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get my wishlist' })
    async getWishlist(
        @CurrentUser('id') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.productsService.getWishlist(userId, +page, +limit);
    }

    // ─── SELLER ENDPOINTS ─────────────────────

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new product (sellers)' })
    @ApiResponse({ status: 201, description: 'Product created, pending approval' })
    async createProduct(
        @CurrentUser('id') sellerId: string,
        @Body() createDto: CreateProductDto,
    ) {
        return this.productsService.createProduct(sellerId, createDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update a product (sellers)' })
    async updateProduct(
        @CurrentUser('id') sellerId: string,
        @Param('id', ParseUUIDPipe) productId: string,
        @Body() updateDto: UpdateProductDto,
    ) {
        return this.productsService.updateProduct(sellerId, productId, updateDto);
    }

    // ─── ADMIN ENDPOINTS ─────────────────────

    @Get('admin/pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'List pending products (admin)' })
    async getPending(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.productsService.findPendingProducts(+page, +limit);
    }

    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Approve or reject a product (admin)' })
    async approveProduct(
        @CurrentUser('id') adminId: string,
        @Param('id', ParseUUIDPipe) productId: string,
        @Body() approveDto: AdminApproveProductDto,
    ) {
        return this.productsService.adminApproveProduct(productId, adminId, approveDto);
    }

    @Patch(':id/feature')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Toggle featured status (admin)' })
    async toggleFeatured(@Param('id', ParseUUIDPipe) productId: string) {
        return this.productsService.toggleFeatured(productId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Hard delete a product (admin)' })
    async deleteProduct(@Param('id', ParseUUIDPipe) productId: string) {
        await this.productsService.adminDeleteProduct(productId);
        return { message: 'Product deleted' };
    }
}
