import { Controller, Post, Body, UnauthorizedException, Param, UsePipes, ValidationPipe, Req } from '@nestjs/common';
import { AccountORM } from 'src/System/ORM';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import md5 from 'md5';
import { IsNotEmpty } from 'class-validator';
import { userService } from 'src/Module/User';

class LoginDto {
    @IsNotEmpty()
    account: string;

    @IsNotEmpty()
    password: string;
}
@Controller()
export class AuthController {

    constructor(private jwtService: JwtService, private userService: userService) {

    }

    @InjectRepository(AccountORM)
    private usersRepo: Repository<AccountORM>

    @Post('login')
    async login(@Req() params: LoginDto) {

        const user = await this.usersRepo.findOne({ where: { account: params.account } });
        if (!user) throw new UnauthorizedException();
        console.log(user);
        if (user && user.password !== md5(params.password)) {

            throw new UnauthorizedException();
        }

        const payload = { username: user.account, sub: user.account };
        return {
            access_token: this.jwtService.sign(payload, {
                secret: process.env.JWT_KEY,
                expiresIn: '24h'
            }),
        };

    }

    @Post('register')
    async register(@Body() body: { account: string, password: string }) {

        // const user = await this.

    }
}