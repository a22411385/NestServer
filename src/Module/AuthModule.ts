import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "../Controller/auth.controller";
import { AccountORM } from "../ORM/account.entity";
import { CharacterORM } from "../ORM/charater.entity";
import { AuthGuard } from "../Provider/AuthGuard";

@Module({
    imports: [TypeOrmModule.forFeature([AccountORM, CharacterORM])],
    controllers: [AuthController],
    providers: [{
        provide: APP_GUARD,
        useClass: AuthGuard,

    }],

})
export class AuthModule { }