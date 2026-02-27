import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity('order_addresses')
export class OrderAddressEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', unique: true })
    orderId: string;

    @Column({ type: 'varchar', length: 255 })
    fullName: string;

    @Column({ type: 'varchar', length: 15 })
    phone: string;

    @Column({ type: 'varchar', length: 500 })
    addressLine1: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    addressLine2: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    landmark: string | null;

    @Column({ type: 'varchar', length: 100 })
    city: string;

    @Column({ type: 'varchar', length: 100 })
    state: string;

    @Column({ type: 'varchar', length: 6 })
    pincode: string;

    @Column({ type: 'varchar', length: 50, default: 'India' })
    country: string;

    // Relations
    @OneToOne(() => OrderEntity, (order) => order.address, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'orderId' })
    order: OrderEntity;
}
