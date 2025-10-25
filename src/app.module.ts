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
      type: process.env.DB_TYPE as any || 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'game',
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
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