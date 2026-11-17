import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './auth.types';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password, 10);
    const user = await this.usersService.create(
      dto.name,
      dto.email.toLowerCase(),
      passwordHash,
    );
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      token_version: user.token_version,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    const passwordOK = user
      ? await compare(dto.password, user.password_hash)
      : false;

    if (!user || !passwordOK) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      token_version: user.token_version,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email },
    };
  }

  async me(userId: number) {
    const user = await this.usersService.findProfileById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async updateProfileImage(userId: number, profileImageUrl: string) {
    return this.usersService.updateProfileImage(userId, profileImageUrl);
  }

  async logout(userId: number) {
    await this.usersService.revokeTokens(userId);
    return {
      message: 'Logged out successfully. This access token is now invalid.',
    };
  }

  async addGalleryPhotos(userId: number, imageUrls: string[]) {
    return this.usersService.addGalleryPhotos(userId, imageUrls);
  }

  async getGalleryPhotos(userId: number, imageUrls: string[]) {
    return this.usersService.findGalleryPhotos(userId);
  }

  async createImportedStudentAccount(name: string, email: string) {
    const { randomBytes } = await import('crypto');

    // 32 random bytes encoded as 43 URL-safe characters.
    // The password is never returned or logged.

    const temporaryPassword = randomBytes(32).toString('base64url');
    const PasswordHash = await hash(temporaryPassword, 10);

    return this.usersService.create(name, email.toLowerCase(), PasswordHash);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());

    // Return the same response whether the account exists or not.
    if (user) {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await this.usersService.savePasswordResetToken(
        user.id,
        tokenHash,
        expiresAt,
      );

      await this.mailService.sendPasswordResetEmail(user.email, token);
    }

    return {
      message:
        'If an account exists for that email, password reset instructions have been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const passwordHash = await hash(dto.password, 10);

    const reset = await this.usersService.resetPasswordWithToken(
      tokenHash,
      passwordHash,
    );

    if (!reset) {
      throw new BadRequestException(
        'This reset link is invalid or has expired.',
      );
    }

    return { message: 'Password reset successfully.' };
  }
}
