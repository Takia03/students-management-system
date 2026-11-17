import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import {Request} from 'express';
import type { JwtPayload } from './auth.types';
import type { AuthRequest } from './auth.types';


@Injectable()

export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
        private readonly usersService: UsersService,
    ) {}
    


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        
        const request = context.switchToHttp().getRequest<AuthRequest>();
        const token = this.extractToken(request);
        if (!token) {
            throw new UnauthorizedException('Missing or invalid token');
        }


        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
            const tokenVersion = await this.usersService.getTokenVersion(payload.sub);
            if (tokenVersion === null || payload.token_version !== tokenVersion) {
                throw new UnauthorizedException('Invalid or revoked token');
            }
            request.user = payload;
        } catch {
            throw new UnauthorizedException('Invalid or revoked token');
        }
        return true;
    }

    private extractToken(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }

}
