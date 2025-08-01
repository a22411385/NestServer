import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CharacterController } from "src/Controller/character.controller";
import { GameController } from "src/Controller/game.controller";
import { ItemFactoryService } from "src/Service/ItemFactory.service";
import { AccountORM } from "src/ORM/account.entity";
import { CharacterORM } from "src/ORM/charater.entity";
import { CharacterService } from "src/Service/charater.serivce";
import { GoogleSheetsService } from "src/Service/google-sheets.service";
import { ItemEditorController } from "src/Controller/itemEditor.controller";
import { PlayerItemORM } from "src/ORM/playeritem.entity";
import { EquipmentDataORM } from "src/ORM/equipmentData.entity";
import { ColyseusService } from "src/Service/colyseus.service";

@Module({
    imports: [TypeOrmModule.forFeature([AccountORM, CharacterORM, PlayerItemORM, EquipmentDataORM])],
    controllers: [CharacterController, GameController, ItemEditorController],
    providers: [ItemFactoryService, ColyseusService],
    // providers: [CharacterService, GoogleSheetsService, , ItemFactoryService],
    exports: [ItemFactoryService], // 給別人用就 export

})
export class GameModule { }