import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';

export enum CertificateType {
    ORGANIC_CERT = 'organic_cert',
    LAB_REPORT = 'lab_report',
    FSSAI_LICENSE = 'fssai_license',
    AYUSH_CERT = 'ayush_cert',
    OTHER = 'other',
}

@Entity('product_certificates')
export class ProductCertificateEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    productId: string;

    @Column({ type: 'enum', enum: CertificateType })
    documentType: CertificateType;

    @Column({ type: 'varchar', length: 1000 })
    documentUrl: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    issuingAuthority: string | null;

    @Column({ type: 'date', nullable: true })
    issueDate: Date | null;

    @Column({ type: 'date', nullable: true })
    expiryDate: Date | null;

    @Column({ type: 'boolean', default: false })
    isVerifiedByAdmin: boolean;

    @CreateDateColumn()
    createdAt: Date;

    // Relations
    @ManyToOne(() => ProductEntity, (product) => product.certificates, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity;
}
