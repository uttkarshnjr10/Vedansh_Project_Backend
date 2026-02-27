import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    async findById(id: string): Promise<UserEntity> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async findByPhone(phone: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { phone } });
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async updateProfile(
        userId: string,
        updateProfileDto: UpdateProfileDto,
    ): Promise<UserEntity> {
        const user = await this.findById(userId);

        // Check email uniqueness if changing email
        if (updateProfileDto.email && updateProfileDto.email !== user.email) {
            const existing = await this.findByEmail(updateProfileDto.email);
            if (existing && existing.id !== userId) {
                throw new ConflictException('Email already in use');
            }
        }

        if (updateProfileDto.fullName !== undefined) {
            user.fullName = updateProfileDto.fullName;
        }
        if (updateProfileDto.email !== undefined) {
            user.email = updateProfileDto.email;
        }

        return this.userRepository.save(user);
    }

    async updateAvatar(userId: string, avatarUrl: string): Promise<UserEntity> {
        const user = await this.findById(userId);
        user.avatar = avatarUrl;
        return this.userRepository.save(user);
    }
}
