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
import { WeaponInstanceManager } from './Game/Managers/WeaponInstanceManager';
import { WeaponFactory } from './Game/Factories/WeaponFactory';
import { TagService } from './Game/Services/TagService';
import { VisualEffectService } from './Game/Services/VisualEffectService';

export const IS_PUBLIC_KEY = 'isPublic';
export const IsPublic = () => SetMetadata(IS_PUBLIC_KEY, true);

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({

    origin: [`http://${process.env.SERVER_HOST}:5175`],
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


  await app.listen(process.env.PORT ?? 8000, process.env.SERVER_HOST ?? 'localhost');


  const colyseusServer = new ColyseusServer();
  await colyseusServer.listen(3001);

  console.log(`NestJS server running on: http://${process.env.SERVER_HOST}:${process.env.PORT ?? 8000}`);
  console.log(`Colyseus server running on: http://localhost:3001`);

  // 🎯 初始化順序很重要，必須按照依賴關係依序初始化
  try {
    console.log('🔧 開始初始化遊戲系統...');

    // 1️⃣ 初始化 Google Sheets 快取（最底層依賴）
    console.log('📥 步驟 1/5: 初始化 Google Sheets 快取...');
    const googlesheet = new GoogleSheetCache();
    await googlesheet.init();
    console.log('✅ Google Sheets 快取已就緒');

    // 2️⃣ 初始化標籤服務（依賴 GoogleSheetCache）
    console.log('🏷️ 步驟 2/6: 初始化標籤服務...');
    const tagService = TagService.getInstance();
    await tagService.initialize();
    console.log('✅ 標籤服務已初始化');

    // 3️⃣ 初始化視覺效果服務（依賴 GoogleSheetCache）
    console.log('🎨 步驟 3/6: 初始化視覺效果服務...');
    const visualEffectService = VisualEffectService.getInstance();
    await visualEffectService.initialize();
    console.log('✅ 視覺效果服務已初始化');

    // 4️⃣ 初始化武器工廠（依賴 GoogleSheetCache）
    console.log('🏭 步驟 4/6: 初始化武器工廠...');
    await WeaponFactory.initialize();
    console.log('✅ 武器工廠已初始化');

    // 5️⃣ 初始化武器實例管理器（依賴 WeaponFactory）
    console.log('🔧 步驟 5/6: 初始化武器實例管理器...');
    await WeaponInstanceManager.initialize();
    console.log('✅ 武器實例管理器已初始化');

    // 6️⃣ 初始化天賦系統（依賴 GoogleSheetCache）
    console.log('⭐ 步驟 6/6: 初始化天賦系統...');
    await TalentSystemInitializer.initialize();
    console.log('✅ 天賦系統已初始化');

    console.log('🎉 所有遊戲系統初始化完成！');

  } catch (error) {
    console.error('❌ 遊戲系統初始化失敗:', error);
    console.error('   伺服器將繼續運行，但部分功能可能無法使用');
    console.error('   請檢查：');
    console.error('   1. Google Sheets 快取檔案是否存在: data/google-sheets-cache.json');
    console.error('   2. 環境變數 GOOGLE_SHEET_URL 是否設置');
    console.error('   3. 網路連接是否正常');
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
