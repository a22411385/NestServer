import { Controller, Post, Body, } from '@nestjs/common';

import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import md5 from 'md5';
import { IsNotEmpty } from 'class-validator';
import { HttpResponse, JWTPayload } from '@/Types';

import { DataCenter, UserData } from '../Provider/DataCenter';
import { AccountORM } from '../ORM/account.entity';
import { CharacterORM } from '../ORM/charater.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from './ErrorCode';

class LoginDto {
    @IsNotEmpty()
    account: string;

    @IsNotEmpty()
    password: string;
}
@Controller()
export class AuthController {

    constructor(private jwtService: JwtService) {

    }
    @InjectRepository(AccountORM)
    private usersRepo: Repository<AccountORM>
    @InjectRepository(CharacterORM)
    private charRepo: Repository<CharacterORM>

    @Post('login')
    async login(@Body() params: LoginDto): Promise<HttpResponse> {

        console.log(params.account, params.password);
        let res = { errorCode: ErrorCode.SUCCESS } as HttpResponse;
        const user = await this.usersRepo.findOne({ where: { account: params.account } });

        if (!user || user.password !== md5(params.password)) {
            res.errorCode = ErrorCode.ACCOUNT_OR_PASSWORD_ERROR;
            return res;
        }

        //如果有資料要先儲存
        if (DataCenter.Users[user.id] != undefined) {
            let uu = DataCenter.Users[user.id];
            if (uu.account)
                await this.usersRepo.save(uu.account);
            if (uu.character)
                await this.charRepo.save(uu.character);
        }

        let u = new UserData();
        u.account = user;
        u.character = null;
        // u.characters = c;

        DataCenter.Users[user.id] = new UserData();

        const payload = { userId: user.id, openId: user.openId } as JWTPayload;
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

        let res = { errorCode: ErrorCode.SUCCESS } as HttpResponse;
        const user = await this.usersRepo.findOne({ where: { account: body.account } });

        if (user) {
            res.errorCode = ErrorCode.ACCOUNT_ALREADY_EXIST;
            return res;
        }

        let newUser = new AccountORM();
        newUser.account = body.account;
        newUser.password = md5(body.password);
        newUser.openId = md5(body.account + 'rpg');

        let u = await this.usersRepo.save(newUser);

        const payload = { openId: u.openId, userId: u.id } as JWTPayload;
        res.content =
        {
            access_token: this.jwtService.sign(payload, {
                secret: process.env.JWT_KEY,
                expiresIn: '24h'
            }),
        };
        return res;
    }

    @Post('/game/test')
    async Test() {

        return { errorCode: ErrorCode.SUCCESS } as HttpResponse;
    }
}