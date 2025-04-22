//--- start app.module.ts --- 
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './Module/AuthModule';
import { GameModule } from './Module/GameModule';
import { DataModule } from './Module/DataModule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from 'dotenv';
import path from 'path';

const isProduction = function (): boolean {

  return process.env.NODE_ENV !== 'development';
}
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql', // 或 'postgres'
      host: 'localhost',
      port: 3306,     // 或 postgres 是 5432
      username: 'root',
      password: 'root',
      database: 'game',
      autoLoadEntities: true,
      synchronize: true, // 開發環境可以設 true，自動建立表格
    }),
    DataModule,

    AuthModule,
    GameModule,
    JwtModule.register({ global: true, secret: process.env.JWT_KEY }),
  ],

})
export class AppModule { }
//--- end app.module.ts --- 