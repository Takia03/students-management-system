import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { Body } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthRequest } from './auth.types';
import type { request } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }



  @Get('me')
  async me(@Req() request: AuthRequest) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token');
    }
    return this.authService.me(userId);
  }

  @Post('me/profile-picture')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'upload'),
        filename: (_request, file, callback) => {
          callback(
            null,
            `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
          );
        },
      }),

      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ];

        if(!allowedTypes.includes(file.mimetype)){
            return callback(
                new BadRequestException('Upload a JPG, PNG, WEBP, or GIF image'),
                false,
            );
        }

        callback (null, true);
      },
    }),
  )

  async uploadProfilePicture(
    @Req() request: AuthRequest,
    @UploadedFile() file?: { filename: string},
  ){
    const userId = request.user?.sub;

    if(!userId){
        throw new UnauthorizedException('Invalid token');
    }

    if (!file){
        throw new BadRequestException('Choose an image to upload');
    }

    return this.authService.updateProfileImage(
        userId,
        `/upload/${file.filename}`,
    );
  }

  @Post('logout')
  async logout(@Req() request: AuthRequest) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token');
    }
    return this.authService.logout(userId);
  }

  @Get('me/gallery')
  async getGallery(@Req() request: AuthRequest){
  const userId = request.user?.sub;

  if (!userId) {
    throw new UnauthorizedException('Invalid token');
  }

  return this.authService.getGalleryPhotos(userId, []);
}
 @Post('me/gallery')
@UseInterceptors(
  FilesInterceptor('files', 20, {
    storage: diskStorage({
      destination: join(process.cwd(), 'upload'),
      filename: (_request, file, callback) => {
        callback(
          null,
          `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
        );
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException('Upload JPG, PNG, WEBP, or GIF images'),
          false,
        );
      }

      callback(null, true);
    },
  }),
)
async uploadGalleryPhotos(
  @Req() request: AuthRequest,
  @UploadedFiles() files?: { filename: string }[],
) {
  const userId = request.user?.sub;

  if (!userId) {
    throw new UnauthorizedException('Invalid token');
  }

  if (!files?.length) {
    throw new BadRequestException('Choose at least one image to upload');
  }

  const imageUrls = files.map((file) => `/upload/${file.filename}`);
  return this.authService.addGalleryPhotos(userId, imageUrls);
}
}


// check
