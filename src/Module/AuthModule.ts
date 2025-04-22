import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "src/Controller/auth.controller";
import { AccountORM } from "src/ORM/account.entity";
import { CharacterORM } from "src/ORM/charater.entity";
import { AuthGuard } from "src/Provider/AuthGuard";

@Module({
    imports: [TypeOrmModule.forFeature([AccountORM, CharacterORM])],
    controllers: [AuthController],
    providers: [{
        provide: APP_GUARD,
        useClass: AuthGuard,

    }],

})
export class AuthModule { }