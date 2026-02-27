import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { AddressesService } from './addresses.service';
import { UsersController } from './users.controller';
import { UserEntity } from './entities/user.entity';
import { UserAddressEntity } from './entities/user-address.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([UserEntity, UserAddressEntity]), AuthModule],
    controllers: [UsersController],
    providers: [UsersService, AddressesService],
    exports: [UsersService, AddressesService],
})
export class UsersModule { }

