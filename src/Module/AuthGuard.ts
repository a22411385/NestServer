import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ErrorCode } from 'src/errorCode';
import { HttpRespone, JWTPayload } from 'src/struct';


@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        const request = context.switchToHttp().getRequest();
        const path = request.path as string;
        if (path == '/login' || path == '/register' || path.startsWith('public/')) {
            return true;
        }
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new BadRequestException({
                errorCode: ErrorCode.VERIFICATION_EXPIRED,

            } as HttpRespone);
        }
        try {
            const payload = await this.jwtService.verifyAsync(
                token,
                {
                    secret: process.env.JWT_KEY
                }
            ) as JWTPayload;
            // 💡 We're assigning the payload to the request object here
            // so that we can access it in our route handlers
            request['user'] = payload;
        } catch {
            throw new BadRequestException({
                errorCode: ErrorCode.VERIFICATION_EXPIRED,

            } as HttpRespone);
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}