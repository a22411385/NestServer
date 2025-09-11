import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WeaponPropertyService } from './src/Game/Services/WeaponPropertyService';
import { WeaponQuality } from './src/Types/Equipment/WeaponPropertyTypes';

async function testWeaponProperty() {
    console.log('🚀 測試武器屬性生成...\n');

    try {
        const app = await NestFactory.create(AppModule);
        const weaponPropertyService = app.get(WeaponPropertyService);

        console.log('✅ 服務初始化成功');

        // 測試 fireball 武器屬性生成
        console.log('\n🔥 測試 fireball 武器屬性生成...');
        const fireballProps = await weaponPropertyService.generateWeaponProperties('fireball', WeaponQuality.NORMAL, 12345);

        console.log('✅ fireball 武器屬性生成成功:');
        console.log(`總共生成 ${fireballProps.length} 個屬性:`);
        fireballProps.forEach(prop => {
            console.log(`  - ${prop.type}: ${prop.value} ${prop.isPercentage ? '%' : ''} (${prop.description})`);
        });

        await app.close();

    } catch (error) {
        console.error('❌ 測試失敗:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testWeaponProperty();
