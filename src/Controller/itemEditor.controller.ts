import { Controller, Post, Body, Req, Get, Query } from '@nestjs/common';
import { IsNotEmpty } from 'class-validator';

import { JWTPayload } from 'src/struct';
import { ErrorCode } from 'src/Shared/ErrorCode';
import { DataCenter } from 'src/Provider/DataCenter';
import { RoomGateway } from 'src/Provider/room.gateway';
import { HttpRespone } from 'src/Shared/struct';
import { ResponeError, ResponeSuccess } from 'src/Util/respone.util';
import { ItemFactoryService } from 'src/Service/ItemFactory.service';
import { IsPublic } from 'src/main';
import { MonsterKind } from 'src/Game/Item/ItemData';

class CreateItemParam {


    lv: number;

}
@Controller()
export class ItemEditorController {

    // //開啟一場單人戰鬥

    constructor(private readonly factory: ItemFactoryService) { }

    @Get('/item/create')
    async testDrop(
        @Query('kind') kind: MonsterKind = 'normal',
        @Query('level') level = 1,
        @Req() req: any
    ) {
        let payload = req.user as JWTPayload;
        const drops = this.factory.generateDrops({
            kind,
            level: Number(level),
        });
        if (payload.playerId) {
            await this.factory.saveItems(drops, payload.playerId)
        } else {
            console.warn("角色不存在 不儲存物品");
        }
        return ResponeSuccess({ drops });
    }
}