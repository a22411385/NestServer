import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { CharacterORM } from '../ORM/charater.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNotEmpty } from 'class-validator';
import { HttpResponse, JWTPayload } from '@/Types';
import { JwtService } from '@nestjs/jwt';
import { AccountORM } from '../ORM/account.entity';
import { ErrorCode } from './ErrorCode';

const MAX_CHAR_NUM = 8;

class CreateDto {
    @IsNotEmpty()
    name: string;
}
class SelectCharParm {

    @IsNotEmpty()
    id: number;

}
@Controller()
export class CharacterController {

    constructor(private jwtService: JwtService) { }


    @InjectRepository(CharacterORM)
    private characterRepo: Repository<CharacterORM>

    @InjectRepository(AccountORM)
    private accountRepo: Repository<AccountORM>

    @Post('/char/create')
    async create(@Req() req: any, @Body() params: CreateDto): Promise<HttpResponse> {

        let payload = req.user as JWTPayload;

        let res = { errorCode: ErrorCode.SUCCESS } as HttpResponse;

        const account = await this.accountRepo.findOneOrFail({ where: { id: payload.userId }, relations: { characters: true } });

        console.log(account);
        if (account.characters.length >= MAX_CHAR_NUM) {
            res.errorCode = ErrorCode.OUT_OF_RANGE;
            return res;
        }

        const p = await this.characterRepo.findOne({ where: { name: params.name } });
        if (p) {
            res.errorCode = ErrorCode.NAME_ALREADY_USED
            return res;
        }
        let character = new CharacterORM();
        character.exp = 0;

        character.name = params.name;
        character.user = account;
        await this.characterRepo.save(character);
        return res;

    }

    @Get('/char/get')
    async getPlayers(@Req() req: any): Promise<HttpResponse> {

        let payload = req.user as JWTPayload;

        let res = { errorCode: ErrorCode.SUCCESS } as HttpResponse;

        const account = await this.accountRepo.findOneOrFail({
            select: {
                characters: {
                    "exp": true, "name": true, "id": true
                }
            }, where: { id: payload.userId },
            relations: { characters: true, },

        });
        res.content = account.characters.map(char => ({
            id: char.id,
            name: char.name,
            exp: char.exp,

            lv: char.Lv, // 使用 getter 計算等級
        }));;

        return res;

    }

    //選擇腳色 (這裡要重新給token)
    @Post('/char/select')
    async selectPlayer(@Req() req: any, @Body() params: SelectCharParm): Promise<HttpResponse> {

        let payload = req.user as JWTPayload;
        let res = { errorCode: ErrorCode.SUCCESS } as HttpResponse;
        const char = await this.accountRepo.findOne({ where: { id: payload.userId, characters: { id: params.id } } });
        if (char) {
            //重新簽發token
            const e = { userId: payload.userId, openId: payload.openId, playerId: params.id } as JWTPayload;
            res.content =
            {
                access_token: this.jwtService.sign(e, {
                    secret: process.env.JWT_KEY,
                    expiresIn: '24h'
                }),
            };

            return res;
        } else {
            res.errorCode = ErrorCode.DATA_NOT_EXISTS;
            return res;
        }
    }
    @Get('/player/detail')
    async PlayerDetail(@Req() req: any) {
        let payload = req.user as JWTPayload;
        console.log('playerId', payload.playerId);
        let res = { errorCode: ErrorCode.SUCCESS } as HttpResponse;
        return res;
    }

}