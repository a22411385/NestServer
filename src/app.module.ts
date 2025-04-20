import { Module } from '@nestjs/common';
import { AppController } from './Controller/app.controller';
import { AppService } from './app.service';
import { AuthController } from './Controller/auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountORM } from './System/ORM';
@Module({
  imports: [PassportModule, JwtModule.register({}),
    TypeOrmModule.forRoot({
      type: 'mysql', // 或 'postgres'
      host: 'localhost',
      port: 3306,     // 或 postgres 是 5432
      username: 'root',
      password: 'root',
      database: 'game',
      entities: [AccountORM],
      synchronize: true, // 開發環境可以設 true，自動建立表格
    }),
    TypeOrmModule.forFeature([AccountORM])],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule { }
