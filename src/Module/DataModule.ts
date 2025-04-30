import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ItemEditorController } from "src/Controller/itemEditor.controller";

import { AccountORM } from "src/ORM/account.entity";
import { DataCenter } from "src/Provider/DataCenter";

@Module({
    imports: [

        TypeOrmModule.forFeature([AccountORM]),
    ],
    controllers: [],
    providers: [DataCenter, ItemEditorController,
    ],
    exports: [], // 給別人用就 export
})
export class DataModule { }