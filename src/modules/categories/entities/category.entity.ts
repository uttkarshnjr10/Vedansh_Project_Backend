import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { SubcategoryEntity } from './subcategory.entity';

@Entity('categories')
export class CategoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 255, unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    imageUrl: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    icon: string | null;

    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @OneToMany(() => SubcategoryEntity, (sub) => sub.category, { cascade: true })
    subcategories: SubcategoryEntity[];
}
