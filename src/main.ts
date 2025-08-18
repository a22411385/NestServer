import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import dotenv from 'dotenv';
import { BadRequestException, INestApplicationContext, ValidationError, ValidationPipe } from '@nestjs/common';
import { ErrorCode } from './Shared/ErrorCode';
import { HttpRespone } from './Shared/struct';
import { SetMetadata } from '@nestjs/common';
import { ColyseusServer } from './Colyseus/ColyseusServer';

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
        errorCode: ErrorCode.參數錯誤,
        errorMsg: arr,
        content: null
      } as HttpRespone);
    },
  }));


  await app.listen(process.env.PORT ?? 8000, 'localhost');

  // 啟動 Colyseus 伺服器
  const colyseusServer = new ColyseusServer();
  await colyseusServer.listen(3001);

  console.log(`🚀 NestJS server running on: http://localhost:${process.env.PORT ?? 8000}`);
  console.log(`🎮 Colyseus server running on: http://localhost:3001`);

  //const testSimulator = app.get(TestSimulatorService);
  //await testSimulator.run();

}
bootstrap();


let appContext: INestApplicationContext | null = null;

export async function getAppContext(): Promise<INestApplicationContext> {
  if (!appContext) {
    appContext = await NestFactory.createApplicationContext(AppModule);
  }
  return appContext;
}