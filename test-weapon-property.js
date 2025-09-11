import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WeaponPropertyService } from './src/Game/Services/WeaponPropertyService';

async function testWeaponProperty() {
    console.log('🚀 測試武器屬性生成...\n');

    try {
        const app = await NestFactory.create(AppModule);
        const weaponPropertyService = app.get(WeaponPropertyService);

        console.log('✅ 服務初始化成功');

        // 測試 fireball 武器屬性生成
        console.log('\n🔥 測試 fireball 武器屬性生成...');
        const fireballProps = await weaponPropertyService.generateWeaponProperties('fireball');

        console.log('✅ fireball 武器屬性生成成功:');
        console.log('🎯 主要屬性:');
        fireballProps.mainProperties.forEach(prop => {
            console.log(`  - ${prop.type}: ${prop.value} ${prop.isPercentage ? '%' : ''}`);
        });

        console.log('🔧 固定屬性:');
        fireballProps.fixedProperties.forEach(prop => {
            console.log(`  - ${prop.type}: ${prop.value} ${prop.isPercentage ? '%' : ''}`);
        });

        await app.close();

    } catch (error) {
        console.error('❌ 測試失敗:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testWeaponProperty();
