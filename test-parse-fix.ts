import { WeaponPropertyService } from './src/Game/Services/WeaponPropertyService';
import { WeaponQuality } from './src/Types/Equipment/WeaponPropertyTypes';
import { GoogleSheetCache } from './src/Tasks/GoogleSheetCache';
import { PropertyValue } from './src/Types/Equipment/WeaponPropertyTypes';

async function testParseCompositeValue() {
    console.log('🚀 測試 parseCompositeValue 修復...\n');

    try {
        // 使用本地快取，不更新
        const googleSheetCache = GoogleSheetCache.getInstance();

        console.log('✅ 使用本地 Google Sheets 快取');

        // 初始化 WeaponPropertyService
        const service = WeaponPropertyService.getInstance();
        await service.initialize();

        console.log('✅ WeaponPropertyService 初始化成功');

        // 測試 fireball 武器屬性生成
        console.log('\n🔥 測試 fireball 武器屬性生成...');
        const fireballProps = service.generateWeaponProperties('fireball', WeaponQuality.NORMAL, 12345);

        console.log('✅ fireball 武器屬性生成成功!');
        console.log(`總共生成 ${fireballProps.length} 個屬性:`);
        fireballProps.forEach((prop: PropertyValue) => {
            console.log(`  - ${prop.type}: ${prop.value} ${prop.isPercentage ? '%' : ''} (${prop.description || 'N/A'})`);
        });

        console.log('\n🎉 測試完成 - parseCompositeValue TypeError 已修復!');

    } catch (error) {
        console.error('❌ 測試失敗:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testParseCompositeValue();
