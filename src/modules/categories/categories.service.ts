import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { SubcategoryEntity } from './entities/subcategory.entity';

export interface CategoryWithSubcategories extends CategoryEntity {
    subcategories: SubcategoryEntity[];
}

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(CategoryEntity)
        private readonly categoryRepository: Repository<CategoryEntity>,
        @InjectRepository(SubcategoryEntity)
        private readonly subcategoryRepository: Repository<SubcategoryEntity>,
    ) { }

    // ─── GET FULL TREE ────────────────────────

    async getFullTree(): Promise<CategoryWithSubcategories[]> {
        // TODO: Cache this in Redis for 24 hours (Phase 8)
        const categories = await this.categoryRepository.find({
            where: { isActive: true },
            relations: ['subcategories'],
            order: { displayOrder: 'ASC' },
        });

        // Sort subcategories within each category
        for (const cat of categories) {
            if (cat.subcategories) {
                cat.subcategories = cat.subcategories
                    .filter((sub) => sub.isActive)
                    .sort((a, b) => a.displayOrder - b.displayOrder);
            }
        }

        return categories as CategoryWithSubcategories[];
    }

    // ─── FIND BY ID ───────────────────────────

    async findById(id: string): Promise<CategoryEntity> {
        const category = await this.categoryRepository.findOne({
            where: { id },
            relations: ['subcategories'],
        });
        if (!category) {
            throw new NotFoundException('Category not found');
        }
        return category;
    }

    // ─── FIND BY SLUG ────────────────────────

    async findBySlug(slug: string): Promise<CategoryEntity> {
        const category = await this.categoryRepository.findOne({
            where: { slug, isActive: true },
            relations: ['subcategories'],
        });
        if (!category) {
            throw new NotFoundException('Category not found');
        }
        return category;
    }

    // ─── ADMIN: CREATE ────────────────────────

    async createCategory(data: {
        name: string;
        slug: string;
        description?: string;
        icon?: string;
        imageUrl?: string;
        displayOrder?: number;
    }): Promise<CategoryEntity> {
        const category = this.categoryRepository.create({
            ...data,
            isActive: true,
        });
        return this.categoryRepository.save(category);
    }

    // ─── ADMIN: UPDATE ────────────────────────

    async updateCategory(
        id: string,
        data: Partial<CategoryEntity>,
    ): Promise<CategoryEntity> {
        const category = await this.findById(id);
        Object.assign(category, data);
        return this.categoryRepository.save(category);
    }

    // ─── ADMIN: REORDER ───────────────────────

    async reorderCategory(id: string, displayOrder: number): Promise<CategoryEntity> {
        const category = await this.findById(id);
        category.displayOrder = displayOrder;
        return this.categoryRepository.save(category);
    }
}
