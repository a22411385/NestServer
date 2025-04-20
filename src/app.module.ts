import { Module } from '@nestjs/common';
import { AppController } from './Controller/app.controller';
import { AuthController } from './Controller/auth.controller';
import { JwtModule } from '@nestjs/jwt';

import { TypeOrmModule } from '@nestjs/typeorm';

import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './Module/AuthGuard';
import { CharacterController } from './Controller/character.controller';
import { AccountORM } from './System/Account.entity';


@Module({
  imports: [JwtModule.register({}),
  TypeOrmModule.forRoot({
    type: 'mysql', // 或 'postgres'
    host: 'localhost',
    port: 3306,     // 或 postgres 是 5432
    username: 'root',
    password: 'root',
    database: 'game',
    entities: [__dirname + '/../**/*.entity.js'],
    synchronize: true, // 開發環境可以設 true，自動建立表格
  })],
  // TypeOrmModule.forFeature([AccountORM, CharacterORM])],
  controllers: [AppController, AuthController, CharacterController],
  providers: [

    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule { }
