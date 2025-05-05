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

class CreateItemParam {


    lv: number;

}
@Controller()
export class ItemEditorController {

    // //開啟一場單人戰鬥

    constructor(private readonly factory: ItemFactoryService) { }

    @Get('/item/create')
    testCreate(
        @Query('itemId') itemId: string,
        @Query('level') level?: string,
        @Query('groupId') groupId?: string,
    ) {
        if (!itemId) return { error: '缺少 itemId' };

        try {
            const parsedLevel = level ? parseInt(level, 10) : 1;

            const result = this.factory.createItem(itemId, {
                level: parsedLevel,
                groupId: groupId,
            });

            return ResponeSuccess(result);
        } catch (e) {
            return { error: e.message };
        }
    }
}