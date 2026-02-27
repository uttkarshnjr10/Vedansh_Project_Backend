import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { SellerEntity } from './seller.entity';
import { DOCUMENT_TYPE } from '../../../common/constants';

export enum DocumentStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('seller_documents')
export class SellerDocumentEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    sellerId: string;

    @Column({ type: 'enum', enum: DOCUMENT_TYPE })
    documentType: DOCUMENT_TYPE;

    @Column({ type: 'varchar', length: 1000 })
    fileUrl: string;

    @Column({ type: 'varchar', length: 500 })
    fileName: string;

    @Column({ type: 'int' })
    fileSizeBytes: number;

    @Column({ type: 'varchar', length: 100 })
    mimeType: string;

    @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.PENDING })
    status: DocumentStatus;

    @Column({ type: 'uuid', nullable: true })
    reviewedBy: string | null;

    @Column({ type: 'timestamp', nullable: true })
    reviewedAt: Date | null;

    @Column({ type: 'text', nullable: true })
    rejectionReason: string | null;

    @Column({ type: 'date', nullable: true })
    expiryDate: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => SellerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sellerId' })
    seller: SellerEntity;
}
