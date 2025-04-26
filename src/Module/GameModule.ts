import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CharacterController } from "src/Controller/character.controller";
import { GameController } from "src/Controller/game.controller";
import { AccountORM } from "src/ORM/account.entity";
import { CharacterORM } from "src/ORM/charater.entity";
import { RoomGateway } from "src/Provider/room.gateway";
import { CharacterService } from "src/Service/charater.serivce";
import { GoogleSheetsService } from "src/Service/google-sheets.service";
import { RoomService } from "src/Service/room.service";

@Module({
    imports: [TypeOrmModule.forFeature([AccountORM, CharacterORM])],
    controllers: [CharacterController, GameController],
    providers: [RoomService, RoomGateway, CharacterService, GoogleSheetsService],

    exports: [], // 給別人用就 export

})
export class GameModule { }