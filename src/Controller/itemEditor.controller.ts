import { Controller, Post, Body, Req } from '@nestjs/common';
import { IsNotEmpty } from 'class-validator';

import { JWTPayload } from 'src/struct';
import { ErrorCode } from 'src/Shared/ErrorCode';
import { DataCenter } from 'src/Provider/DataCenter';
import { RoomGateway } from 'src/Provider/room.gateway';
import { HttpRespone } from 'src/Shared/struct';


@Controller()
export class ItemEditorController {
    // constructor(private readonly roomGateway: RoomGateway) { }
    // //開啟一場單人戰鬥
    // @Post('/game/startBattle')

    // async startBattle(@Req() req: any, @Body() params: BattleParam): Promise<HttpRespone> {

    //     let payload = req.user as JWTPayload;
    //     console.log(payload);
    //     let res = { errorCode: ErrorCode.SUCCESS } as HttpRespone;

    //     let user = await DataCenter.GetUser(payload.userId);
    //     console.log(user);
    //     if (user == null) {
    //         res.errorCode = ErrorCode.不存在的資料;
    //         return res;

    //     } if (user.character == null) {
    //         res.errorCode = ErrorCode.尚未選擇角色;
    //         return res;
    //     }


    //     return res;

    // }


}