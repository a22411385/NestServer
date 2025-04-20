import { Controller, Post, Body, Req } from '@nestjs/common';
import { CharacterORM } from 'src/System/Characte.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNotEmpty } from 'class-validator';

import { HttpRespone, JWTPayload, 職業種類 } from 'src/struct';
import { ErrorCode } from 'src/errorCode';

const MAX_CHAR_NUM = 8;

class CreateDto {
    @IsNotEmpty()
    name: string;
}
@Controller()
export class CharacterController {

    @InjectRepository(CharacterORM)
    private characterRepo: Repository<CharacterORM>

    @Post('/char/create')
    async create(@Req() req: any, @Body() params: CreateDto): Promise<HttpRespone> {

        let payload = req.user as JWTPayload;
        console.log(payload);
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


}