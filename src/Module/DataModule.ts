import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AccountORM } from "../ORM/account.entity";
import { DataCenter } from "../Provider/DataCenter";

@Module({
    imports: [

        TypeOrmModule.forFeature([AccountORM]),
    ],
    controllers: [],
    providers: [DataCenter,
    ],
    exports: [], // 給別人用就 export
})
export class DataModule { }