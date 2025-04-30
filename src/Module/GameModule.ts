import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CharacterController } from "src/Controller/character.controller";
import { GameController } from "src/Controller/game.controller";
import { ItemFactoryService } from "src/Service/ItemFactory.service";
import { AccountORM } from "src/ORM/account.entity";
import { CharacterORM } from "src/ORM/charater.entity";
import { RoomGateway } from "src/Provider/room.gateway";
import { CharacterService } from "src/Service/charater.serivce";
import { GameService } from "src/Service/game.service";
import { GoogleSheetsService } from "src/Service/google-sheets.service";
import { ItemEditorController } from "src/Controller/itemEditor.controller";

@Module({
    imports: [TypeOrmModule.forFeature([AccountORM, CharacterORM])],
    controllers: [CharacterController, GameController, ItemEditorController],
    providers: [RoomGateway, CharacterService, GoogleSheetsService, GameService, ItemFactoryService],

    exports: [RoomGateway, ItemFactoryService], // 給別人用就 export

})
export class GameModule { }