import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CharacterController } from "src/Controller/character.controller";
import { GameController } from "src/Controller/game.controller";
import { AccountORM } from "src/ORM/Account.entity";
import { CharacterORM } from "src/ORM/Characte.entity";
import { RoomGateway } from "src/Provider/room.gateway";
import { RoomService } from "src/Service/room.service";

@Module({
    imports: [TypeOrmModule.forFeature([AccountORM, CharacterORM])],
    controllers: [CharacterController, GameController],
    providers: [RoomService, RoomGateway],
    exports: [], // 給別人用就 export

})
export class GameModule { }