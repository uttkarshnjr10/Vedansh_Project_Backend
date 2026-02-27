import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddressEntity } from './entities/user-address.entity';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
    private readonly logger = new Logger(AddressesService.name);
    private readonly MAX_ADDRESSES = 5;

    constructor(
        @InjectRepository(UserAddressEntity)
        private readonly addressRepository: Repository<UserAddressEntity>,
    ) { }

    async getAddresses(userId: string): Promise<UserAddressEntity[]> {
        return this.addressRepository.find({
            where: { userId },
            order: { isDefault: 'DESC', createdAt: 'DESC' },
        });
    }

    async addAddress(
        userId: string,
        dto: CreateAddressDto,
    ): Promise<UserAddressEntity> {
        const count = await this.addressRepository.count({ where: { userId } });
        if (count >= this.MAX_ADDRESSES) {
            throw new BadRequestException(
                `Maximum ${this.MAX_ADDRESSES} addresses allowed`,
            );
        }

        // If first address or no default, set as default
        const hasDefault = await this.addressRepository.findOne({
            where: { userId, isDefault: true },
        });

        const address = this.addressRepository.create({
            userId,
            ...dto,
            isDefault: !hasDefault,
        });

        return this.addressRepository.save(address);
    }

    async updateAddress(
        userId: string,
        addressId: string,
        dto: UpdateAddressDto,
    ): Promise<UserAddressEntity> {
        const address = await this.addressRepository.findOne({
            where: { id: addressId, userId },
        });
        if (!address) throw new NotFoundException('Address not found');

        Object.assign(address, dto);
        return this.addressRepository.save(address);
    }

    async deleteAddress(userId: string, addressId: string): Promise<void> {
        const address = await this.addressRepository.findOne({
            where: { id: addressId, userId },
        });
        if (!address) throw new NotFoundException('Address not found');

        await this.addressRepository.remove(address);

        // If deleted was default, set another as default
        if (address.isDefault) {
            const next = await this.addressRepository.findOne({
                where: { userId },
                order: { createdAt: 'DESC' },
            });
            if (next) {
                next.isDefault = true;
                await this.addressRepository.save(next);
            }
        }
    }

    async setDefaultAddress(userId: string, addressId: string): Promise<UserAddressEntity> {
        const address = await this.addressRepository.findOne({
            where: { id: addressId, userId },
        });
        if (!address) throw new NotFoundException('Address not found');

        // Unset current default
        await this.addressRepository.update(
            { userId, isDefault: true },
            { isDefault: false },
        );

        address.isDefault = true;
        return this.addressRepository.save(address);
    }

    async getAddressById(userId: string, addressId: string): Promise<UserAddressEntity> {
        const address = await this.addressRepository.findOne({
            where: { id: addressId, userId },
        });
        if (!address) throw new NotFoundException('Address not found');
        return address;
    }
}
