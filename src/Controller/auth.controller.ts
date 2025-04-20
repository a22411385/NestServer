import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AccountORM } from 'src/System/ORM';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import md5 from 'md5';
import { IsNotEmpty } from 'class-validator';
import { userService } from 'src/Module/User';
import { HttpRespone } from 'src/struct';
import { ErrorCode } from 'src/errorCode';
import { AuthGuard } from 'src/Module/AuthGuard';
import { IsPublic } from 'src/main';

class LoginDto {
    @IsNotEmpty()
    account: string;

    @IsNotEmpty()
    password: string;
}
@Controller()
@UseGuards(AuthGuard)
export class AuthController {

    constructor(private jwtService: JwtService) {

    }

    @InjectRepository(AccountORM)
    private usersRepo: Repository<AccountORM>

    @Post('login')
    async login(@Body() params: LoginDto): Promise<HttpRespone> {

        console.log(params.account, params.password);
        let res = { errorCode: ErrorCode.SUCCESS } as HttpRespone;
        const user = await this.usersRepo.findOne({ where: { account: params.account } });

        if (!user || user.password !== md5(params.password)) {
            res.errorCode = ErrorCode.ACCOUNT_OR_PASSWORD_ERROR;
            return res;
        }

        const payload = { username: user.account, sub: user.account };
        res.content =
        {
            access_token: this.jwtService.sign(payload, {
                secret: process.env.JWT_KEY,
                expiresIn: '24h'
            }),
        };
        return res;

    }

    @Post('register')
    async register(@Body() body: { account: string, password: string }) {

        // const user = await this.

    }

    @Post('/game/test')
    async Test() {


    }
}