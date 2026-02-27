import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES } from '../../common/constants';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    // ─── PUBLIC ───────────────────────────────

    @Public()
    @Get()
    @ApiOperation({ summary: 'Get full category tree with subcategories' })
    @ApiResponse({ status: 200, description: 'Category tree returned' })
    async getAll() {
        return this.categoriesService.getFullTree();
    }

    @Public()
    @Get(':slug')
    @ApiOperation({ summary: 'Get single category by slug' })
    @ApiResponse({ status: 200, description: 'Category with subcategories' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    async findBySlug(@Param('slug') slug: string) {
        return this.categoriesService.findBySlug(slug);
    }

    // ─── ADMIN ────────────────────────────────

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a category (admin)' })
    @ApiResponse({ status: 201, description: 'Category created' })
    async createCategory(
        @Body() body: { name: string; slug: string; description?: string; icon?: string; displayOrder?: number },
    ) {
        return this.categoriesService.createCategory(body);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update a category (admin)' })
    async updateCategory(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { name?: string; description?: string; icon?: string; isActive?: boolean },
    ) {
        return this.categoriesService.updateCategory(id, body);
    }

    @Patch(':id/reorder')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Reorder a category (admin)' })
    async reorder(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { displayOrder: number },
    ) {
        return this.categoriesService.reorderCategory(id, body.displayOrder);
    }
}
