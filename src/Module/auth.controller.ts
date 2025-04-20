import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body: { account: string; password: string }) {
        const user = await this.authService.validateUser(body.account, body.password);
        if (!user) throw new UnauthorizedException();
        return this.authService.login(user);
    }
}