import { Controller, Post, Body, Req, Get } from '@nestjs/common';
import { CharacterORM } from 'src/ORM/charater.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNotEmpty } from 'class-validator';

import { JWTPayload } from 'src/struct';
import { ErrorCode } from 'src/Shared/ErrorCode';
import { 職業種類 } from 'src/Shared/Enum';
import { JwtService } from '@nestjs/jwt';
import { HttpRespone } from 'src/Shared/struct';

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

    @Post('/char/create')
    async create(@Req() req: any, @Body() params: CreateDto): Promise<HttpRespone> {

        let payload = req.user as JWTPayload;

        let res = { errorCode: ErrorCode.SUCCESS } as HttpRespone;
        const characters = await this.characterRepo.find({ where: { userId: payload.userId } });
        if (characters.length >= MAX_CHAR_NUM) {
            res.errorCode = ErrorCode.OUT_OF_RANGE;
            return res;
        }

        const p = await this.characterRepo.findOne({ where: { name: params.name } });
        if (p) {
            res.errorCode = ErrorCode.名稱已被使用
            return res;
        }
        let character = new CharacterORM();
        character.exp = 0;
        character.lv = 1;
        character.type = 職業種類.初心者;
        character.name = params.name;
        character.userId = payload.userId;
        await this.characterRepo.save(character);
        return res;

    }

    @Get('/char/get')
    async getPlayers(@Req() req: any): Promise<HttpRespone> {

        let payload = req.user as JWTPayload;

        let res = { errorCode: ErrorCode.SUCCESS } as HttpRespone;
        const characters = await this.characterRepo.find({
            select: {
                "exp": true, "lv": true, "name": true, "type": true, "id": true
            }, where: { userId: payload.userId }
        });
        res.content = characters;

        return res;

    }

    //選擇腳色 (這裡要重新給token)
    @Post('/char/select')
    async selectPlayer(@Req() req: any, @Body() params: SelectCharParm): Promise<HttpRespone> {

        let payload = req.user as JWTPayload;
        let res = { errorCode: ErrorCode.SUCCESS } as HttpRespone;
        const char = await this.characterRepo.findOne({ where: { userId: payload.userId, id: params.id } });
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
            res.errorCode = ErrorCode.不存在的資料;
            return res;
        }
    }
    @Get('/player/detail')
    async PlayerDetail(@Req() req: any) {
        let payload = req.user as JWTPayload;
        console.log('playerId', payload.playerId);
        let res = { errorCode: ErrorCode.SUCCESS } as HttpRespone;
        return res;
    }

}