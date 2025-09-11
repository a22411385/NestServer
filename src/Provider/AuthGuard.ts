import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ErrorCode } from '../Controller/ErrorCode';
// ?? ????????
import { HttpResponse, JWTPayload } from '@/Types';


@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        const request = context.switchToHttp().getRequest();
        const path = request.path as string;
        if (path == '/login' || path == '/register' || path.startsWith('/public')) {
            return true;
        }
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new BadRequestException({
                errorCode: ErrorCode.VERIFICATION_EXPIRED,

            } as HttpResponse);
        }
        let payload: JWTPayload;
        try {
            payload = await this.jwtService.verifyAsync(
                token,
                {
                    secret: process.env.JWT_KEY
                }
            ) as JWTPayload;

        } catch {
            throw new BadRequestException({
                errorCode: ErrorCode.VERIFICATION_EXPIRED,

            } as HttpResponse);
        }

        //player????????????????????
        if (payload.playerId == undefined && (path.startsWith('/player/') || path.startsWith('/game/'))) {
            throw new BadRequestException({
                errorCode: ErrorCode.NO_CHARACTER_SELECTED,

            } as HttpResponse);
        }


        request['user'] = payload;

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
