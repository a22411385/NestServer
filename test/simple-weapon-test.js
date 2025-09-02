// 簡單的武器配置測試
console.log('開始測試武器配置系統...');

// 測試導入
try {
    const { getWeaponConfig, getWeaponsByType, getAllWeaponConfigs } = require('../src/Game/Factories/WeaponConfig');
    console.log('✅ WeaponConfig 導入成功');

    // 測試配置獲取
    const baseballBat = getWeaponConfig('baseball_bat');
    if (baseballBat) {
        console.log(`✅ 獲取球棒配置: ${baseballBat.displayName}`);
    }

    const allWeapons = getAllWeaponConfigs();
    console.log(`✅ 總共配置了 ${allWeapons.length} 個武器`);

    const meleeWeapons = getWeaponsByType('melee');
    console.log(`✅ 近戰武器: ${meleeWeapons.length} 個`);

} catch (error) {
    console.log(`❌ 測試失敗: ${error.message}`);
}

console.log('測試完成!');
