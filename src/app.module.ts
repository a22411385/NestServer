//--- start app.module.ts --- 
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountORM } from './ORM/Account.entity';
import { CharacterORM } from './ORM/Characte.entity';
import { AuthModule } from 'Module/AuthModule';
import { GameModule } from 'Module/GameModule';
import { DataModule } from 'Module/DataModule';

@Module({
  imports: [
    AuthModule,
    GameModule,
    DataModule,

    JwtModule.register({}),
  ],

})
export class AppModule { }
//--- end app.module.ts --- 