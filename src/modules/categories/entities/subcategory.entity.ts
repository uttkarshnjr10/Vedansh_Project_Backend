import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { CategoryEntity } from './category.entity';

@Entity('subcategories')
export class SubcategoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 255, unique: true })
    slug: string;

    @Column({ type: 'uuid' })
    categoryId: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    imageUrl: string | null;

    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => CategoryEntity, (cat) => cat.subcategories, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'categoryId' })
    category: CategoryEntity;
}
