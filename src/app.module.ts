//--- start app.module.ts --- 
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './Module/AuthModule';
import { GameModule } from './Module/GameModule';
import { DataModule } from './Module/DataModule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';

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
    CacheModule.register({
      ttl: 60 * 60 * 24, // 預設快取時間（秒）
      max: 100, // 最大快取數量
      isGlobal: true, // 如果要全域使用，設 true
    }),
    DataModule,
    AuthModule,
    GameModule,

    HttpModule,

    JwtModule.register({ global: true, secret: process.env.JWT_KEY }),
    EventEmitterModule.forRoot(),
  ],

})
export class AppModule { }
//--- end app.module.ts --- 