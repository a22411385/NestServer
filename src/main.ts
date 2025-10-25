import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import dotenv from 'dotenv';
import { BadRequestException, INestApplicationContext, ValidationError, ValidationPipe } from '@nestjs/common';
import { ErrorCode } from './Controller/ErrorCode';

import { HttpResponse } from '@/Types';
import { SetMetadata } from '@nestjs/common';
import { ColyseusServer } from './Colyseus/ColyseusServer';
import { GoogleSheetCache } from './Tasks/GoogleSheetCache';
import { TalentSystemInitializer } from './Game/Systems/Talent/TalentSystemInitializer';

export const IS_PUBLIC_KEY = 'isPublic';
export const IsPublic = () => SetMetadata(IS_PUBLIC_KEY, true);

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({

    origin: ["http://localhost:5175"],
    methods: ["GET", "POST", 'OPTIONS'],
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (validationErrors: ValidationError[] = []) => {
      let arr: string[] = [];
      for (var i in validationErrors) {
        const constraints = validationErrors[i].constraints as { [s: string]: string };
        arr.push(validationErrors[i].property + ":" + Object.values(constraints).join(', '));
      }
      return new BadRequestException({
        errorCode: ErrorCode.PARAMETER_ERROR,
        errorMsg: arr,
        content: null
      } as HttpResponse);
    },
  }));


  await app.listen(process.env.PORT ?? 8000, 'localhost');


  const colyseusServer = new ColyseusServer();
  await colyseusServer.listen(3001);

  console.log(`NestJS server running on: http://localhost:${process.env.PORT ?? 8000}`);
  console.log(`Colyseus server running on: http://localhost:3001`);

  // 初始化 Google Sheets 快取
  const googlesheet = new GoogleSheetCache();
  await googlesheet.init();

  // 初始化天賦系統
  try {
    await TalentSystemInitializer.initialize();
  } catch (error) {
    console.error('天賦系統初始化失敗，伺服器將繼續運行但天賦功能可能不可用:', error);
  }
}
bootstrap();


let appContext: INestApplicationContext | null = null;

export async function getAppContext(): Promise<INestApplicationContext> {
  if (!appContext) {
    appContext = await NestFactory.createApplicationContext(AppModule);
  }
  return appContext;
}
