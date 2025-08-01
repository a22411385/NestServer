import { Controller, Post, Body, Req, Get, Query } from '@nestjs/common';

import { JWTPayload } from 'src/struct';
import { ResponeSuccess } from 'src/Util/respone.util';
import { ItemFactoryService } from 'src/Service/ItemFactory.service';
import { MonsterKind } from 'src/Shared/Enum';


@Controller()
export class ItemEditorController {

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