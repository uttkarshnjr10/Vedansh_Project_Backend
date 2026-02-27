import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { AddressesService } from './addresses.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserEntity } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
        private readonly addressesService: AddressesService,
    ) { }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get own profile' })
    @ApiResponse({ status: 200, description: 'User profile returned' })
    async getProfile(@CurrentUser() user: UserEntity) {
        const { passwordHash: _ph, ...safeUser } = user;
        return safeUser;
    }

    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update own profile' })
    @ApiResponse({ status: 200, description: 'Profile updated' })
    async updateProfile(
        @CurrentUser('id') userId: string,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        const user = await this.usersService.updateProfile(
            userId,
            updateProfileDto,
        );
        const { passwordHash: _ph, ...safeUser } = user;
        return safeUser;
    }

    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'List active sessions' })
    @ApiResponse({
        status: 200,
        description: 'Active sessions (no token values exposed)',
    })
    async getSessions(@CurrentUser('id') userId: string) {
        return this.authService.getActiveSessions(userId);
    }

    @Delete('sessions/:tokenId')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Revoke a specific session' })
    @ApiResponse({ status: 200, description: 'Session revoked' })
    async revokeSession(
        @CurrentUser('id') userId: string,
        @Param('tokenId', ParseUUIDPipe) tokenId: string,
    ) {
        await this.authService.revokeTokenById(tokenId, userId);
        return { message: 'Session revoked' };
    }

    // ─── ADDRESSES ───────────────────────────

    @Get('addresses')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get all saved addresses' })
    async getAddresses(@CurrentUser('id') userId: string) {
        return this.addressesService.getAddresses(userId);
    }

    @Post('addresses')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Add new address (max 5)' })
    async addAddress(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateAddressDto,
    ) {
        return this.addressesService.addAddress(userId, dto);
    }

    @Patch('addresses/:id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update address' })
    async updateAddress(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAddressDto,
    ) {
        return this.addressesService.updateAddress(userId, id, dto);
    }

    @Delete('addresses/:id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Delete address' })
    async deleteAddress(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        await this.addressesService.deleteAddress(userId, id);
        return { message: 'Address deleted' };
    }

    @Patch('addresses/:id/set-default')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Set address as default' })
    async setDefaultAddress(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.addressesService.setDefaultAddress(userId, id);
    }
}

