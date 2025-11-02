import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CharacterController } from "../Controller/character.controller";
import { AccountORM } from "../ORM/account.entity";
import { CharacterORM } from "../ORM/charater.entity";
import { CharacterService } from "../Service/charater.serivce";

@Module({
    imports: [TypeOrmModule.forFeature([AccountORM, CharacterORM])],
    controllers: [CharacterController],
    providers: [CharacterService],
})
export class GameModule { }