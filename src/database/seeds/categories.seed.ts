import { DataSource } from 'typeorm';
import { CategoryEntity } from '../../modules/categories/entities/category.entity';
import { SubcategoryEntity } from '../../modules/categories/entities/subcategory.entity';

interface SeedSubcategory {
    name: string;
    slug: string;
    description?: string;
    displayOrder: number;
}

interface SeedCategory {
    name: string;
    slug: string;
    icon: string;
    description: string;
    displayOrder: number;
    subcategories: SeedSubcategory[];
}

const CATEGORIES: SeedCategory[] = [
    {
        name: 'Personal Care',
        slug: 'personal-care',
        icon: '🧴',
        description: 'Natural and herbal personal care products for skin, hair, and oral hygiene',
        displayOrder: 1,
        subcategories: [
            { name: 'Face Wash', slug: 'face-wash', displayOrder: 1 },
            { name: 'Shampoo', slug: 'shampoo', displayOrder: 2 },
            { name: 'Hair Oil', slug: 'hair-oil', displayOrder: 3 },
            { name: 'Soap', slug: 'soap', displayOrder: 4 },
            { name: 'Tooth Powder', slug: 'tooth-powder', displayOrder: 5 },
        ],
    },
    {
        name: 'Health Supplements',
        slug: 'health-supplements',
        icon: '💊',
        description: 'Ayurvedic and herbal supplements for immunity, digestion, and overall wellness',
        displayOrder: 2,
        subcategories: [
            { name: 'Immunity Boosters', slug: 'immunity-boosters', displayOrder: 1 },
            { name: 'Digestion Care', slug: 'digestion-care', displayOrder: 2 },
            { name: 'Stress & Sleep', slug: 'stress-sleep', displayOrder: 3 },
            { name: 'Joint Care', slug: 'joint-care', displayOrder: 4 },
        ],
    },
    {
        name: 'Nutrition / Daily Essentials',
        slug: 'nutrition-daily-essentials',
        icon: '🍯',
        description: 'Herbal teas, natural sweeteners, and superfoods for daily nutrition',
        displayOrder: 3,
        subcategories: [
            { name: 'Herbal Tea', slug: 'herbal-tea', displayOrder: 1 },
            { name: 'Honey', slug: 'honey', displayOrder: 2 },
            { name: 'Jaggery', slug: 'jaggery', displayOrder: 3 },
            { name: 'Superfoods', slug: 'superfoods', displayOrder: 4 },
        ],
    },
    {
        name: 'Organic Products',
        slug: 'organic-products',
        icon: '🌾',
        description: 'Certified organic staples, sweeteners, superfoods, and cold-pressed oils',
        displayOrder: 4,
        subcategories: [
            {
                name: 'Organic Staples',
                slug: 'organic-staples',
                description: 'Rice, Pulses / Dal, Flour / Atta',
                displayOrder: 1,
            },
            {
                name: 'Organic Sweeteners',
                slug: 'organic-sweeteners',
                description: 'Honey, Jaggery',
                displayOrder: 2,
            },
            {
                name: 'Organic Superfoods',
                slug: 'organic-superfoods',
                description: 'Moringa, Turmeric, Amla',
                displayOrder: 3,
            },
            {
                name: 'Organic Oils',
                slug: 'organic-oils',
                description: 'Cold-Pressed Mustard Oil, Groundnut Oil, Coconut Oil',
                displayOrder: 4,
            },
        ],
    },
];

export async function runCategorySeeder(dataSource: DataSource): Promise<void> {
    const categoryRepo = dataSource.getRepository(CategoryEntity);
    const subcategoryRepo = dataSource.getRepository(SubcategoryEntity);

    // Check if categories already exist (idempotent)
    const existingCount = await categoryRepo.count();
    if (existingCount > 0) {
        console.log('⏭  Categories already seeded. Skipping.');
        return;
    }

    console.log('🌱 Seeding categories...');

    for (const catData of CATEGORIES) {
        const category = categoryRepo.create({
            name: catData.name,
            slug: catData.slug,
            icon: catData.icon,
            description: catData.description,
            displayOrder: catData.displayOrder,
            isActive: true,
        });
        const savedCategory = await categoryRepo.save(category);

        for (const subData of catData.subcategories) {
            const subcategory = subcategoryRepo.create({
                name: subData.name,
                slug: subData.slug,
                description: subData.description ?? null,
                displayOrder: subData.displayOrder,
                categoryId: savedCategory.id,
                isActive: true,
            });
            await subcategoryRepo.save(subcategory);
        }

        console.log(`  ✅ ${catData.icon} ${catData.name} (${catData.subcategories.length} subcategories)`);
    }

    console.log('🌱 Category seeding complete!');
}
