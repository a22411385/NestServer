import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CharacterController } from "src/Controller/character.controller";
import { ItemFactoryService } from "src/Service/ItemFactory.service";
import { AccountORM } from "src/ORM/account.entity";
import { CharacterORM } from "src/ORM/charater.entity";

import { ItemEditorController } from "src/Controller/itemEditor.controller";
import { PlayerItemORM } from "src/ORM/playeritem.entity";
import { EquipmentDataORM } from "src/ORM/equipmentData.entity";

@Module({
    imports: [TypeOrmModule.forFeature([AccountORM, CharacterORM, PlayerItemORM, EquipmentDataORM])],
    controllers: [CharacterController, ItemEditorController],
    providers: [ItemFactoryService],
    exports: [ItemFactoryService], // 給別人用就 export

})
export class GameModule { }