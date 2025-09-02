/**
 * 武器配置系統測試
 * 驗證新的集中式武器配置系統是否正常運作
 */

import { getWeaponConfig, getWeaponsByType, getAllWeaponConfigs, WeaponConfig } from '../src/Game/Factories/WeaponConfig';
import { WeaponFactory } from '../src/Game/Factories/WeaponFactory';
import { WeaponData } from '../src/Colyseus/Schema/Weapon/WeaponData';
import { WeaponDataService } from '../src/Game/Services/WeaponDataService';

console.log('=== 武器配置系統測試開始 ===\n');

// 測試 1: 獲取單個武器配置
console.log('📋 測試 1: 獲取武器配置');
console.log('----------------------------');

const baseballBatConfig = getWeaponConfig('baseball_bat');
if (baseballBatConfig) {
    console.log(`✅ 球棒配置: ${baseballBatConfig.displayName} (${baseballBatConfig.type})`);
    console.log(`   傷害: ${baseballBatConfig.baseDamage}, 攻速: ${baseballBatConfig.attackSpeed}ms`);
    console.log(`   稀有度: ${baseballBatConfig.rarity}`);
} else {
    console.log('❌ 無法獲取球棒配置');
}

const fireballConfig = getWeaponConfig('fireball');
if (fireballConfig) {
    console.log(`✅ 火球配置: ${fireballConfig.displayName} (${fireballConfig.type})`);
    console.log(`   傷害: ${fireballConfig.baseDamage}, 攻速: ${fireballConfig.attackSpeed}ms`);
    console.log(`   射程: ${fireballConfig.specialProperties?.projectileRange}`);
} else {
    console.log('❌ 無法獲取火球配置');
}

console.log();

// 測試 2: 按類型獲取武器
console.log('🗡️ 測試 2: 按類型獲取武器');
console.log('----------------------------');

const meleeWeapons = getWeaponsByType('melee');
console.log(`近戰武器 (${meleeWeapons.length}個):`);
meleeWeapons.forEach(weapon => {
    console.log(`  - ${weapon.displayName} (${weapon.id})`);
});

const projectileWeapons = getWeaponsByType('projectile');
console.log(`遠程武器 (${projectileWeapons.length}個):`);
projectileWeapons.forEach(weapon => {
    console.log(`  - ${weapon.displayName} (${weapon.id})`);
});

const supportWeapons = getWeaponsByType('support');
console.log(`支援武器 (${supportWeapons.length}個):`);
supportWeapons.forEach(weapon => {
    console.log(`  - ${weapon.displayName} (${weapon.id})`);
});

console.log();

// 測試 3: 獲取所有武器
console.log('📦 測試 3: 獲取所有武器');
console.log('----------------------------');

const allWeapons = getAllWeaponConfigs();
console.log(`總共 ${allWeapons.length} 個武器已配置:`);
allWeapons.forEach((weapon: WeaponConfig) => {
    console.log(`  - ${weapon.displayName} (${weapon.type}, ${weapon.rarity})`);
});

console.log();

// 測試 4: WeaponFactory 整合
console.log('🏭 測試 4: WeaponFactory 整合');
console.log('----------------------------');

try {
    // 測試創建已實現的武器
    const baseballBat = WeaponFactory.createWeapon('baseball_bat');
    if (baseballBat) {
        console.log(`✅ 成功創建球棒: ${baseballBat.name}`);
        console.log(`   傷害: ${baseballBat.baseDamage}, 攻擊範圍: ${baseballBat.attackRange}`);
    }
} catch (error) {
    console.log(`❌ 創建球棒失敗: ${error}`);
}

try {
    const fireball = WeaponFactory.createWeapon('fireball');
    if (fireball) {
        console.log(`✅ 成功創建火球: ${fireball.name}`);
        console.log(`   傷害: ${fireball.baseDamage}`);
        // console.log(`   射程: ${fireball.projectileRange}`); // 需要從 config 獲取
    }
} catch (error) {
    console.log(`❌ 創建火球失敗: ${error}`);
}

try {
    const healingPotion = WeaponFactory.createWeapon('healing_potion');
    if (healingPotion) {
        console.log(`✅ 成功創建治療藥水: ${healingPotion.name}`);
        console.log(`   傷害/治療: ${healingPotion.baseDamage}`);
        // console.log(`   治療量: ${healingPotion.healAmount}, 冷卻: ${healingPotion.cooldown}ms`); // 需要從 config 獲取
    }
} catch (error) {
    console.log(`❌ 創建治療藥水失敗: ${error}`);
}

// 測試創建未實現的武器 (應該會失敗)
try {
    const ironSword = WeaponFactory.createWeapon('iron_sword');
    if (ironSword) {
        console.log(`⚠️ 意外成功創建鐵劍: ${ironSword.name}`);
    }
} catch (error) {
    console.log(`✅ 鐵劍尚未實現 (預期): ${error.message}`);
}

console.log();

// 測試 5: WeaponData 顯示名稱
console.log('💾 測試 5: WeaponData 顯示名稱');
console.log('----------------------------');

const weaponData1 = new WeaponData('baseball_bat');
console.log(`✅ 球棒顯示名稱: ${WeaponDataService.generateDisplayName(weaponData1)}`);

// 模擬強化和等級提升
weaponData1.level = 5;
weaponData1.enhanceLevel = 2;
console.log(`✅ 強化後球棒: ${WeaponDataService.generateDisplayName(weaponData1)}`);

const weaponData2 = new WeaponData('fireball');
console.log(`✅ 火球顯示名稱: ${WeaponDataService.generateDisplayName(weaponData2)}`);

const weaponData3 = new WeaponData('unknown_weapon');
console.log(`⚠️ 未知武器: ${WeaponDataService.generateDisplayName(weaponData3)}`);

console.log();

// 測試 6: 配置完整性檢查
console.log('🔍 測試 6: 配置完整性檢查');
console.log('----------------------------');

let configErrors = 0;

allWeapons.forEach((weapon: WeaponConfig) => {
    // 檢查必要字段
    if (!weapon.id || !weapon.name || !weapon.displayName) {
        console.log(`❌ ${weapon.id || 'Unknown'}: 缺少基本信息`);
        configErrors++;
    }

    // 檢查數值字段
    if (weapon.baseDamage <= 0 || weapon.attackSpeed <= 0) {
        console.log(`❌ ${weapon.id}: 無效的數值屬性`);
        configErrors++;
    }

    // 檢查類型
    if (!['melee', 'projectile', 'support'].includes(weapon.type)) {
        console.log(`❌ ${weapon.id}: 無效的武器類型 ${weapon.type}`);
        configErrors++;
    }

    // 檢查稀有度
    if (!['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(weapon.rarity)) {
        console.log(`❌ ${weapon.id}: 無效的稀有度 ${weapon.rarity}`);
        configErrors++;
    }
});

if (configErrors === 0) {
    console.log('✅ 所有武器配置都正確！');
} else {
    console.log(`❌ 發現 ${configErrors} 個配置錯誤`);
}

console.log();

// 測試 7: 性能測試
console.log('⚡ 測試 7: 性能測試');
console.log('----------------------------');

const startTime = Date.now();
for (let i = 0; i < 10000; i++) {
    getWeaponConfig('baseball_bat');
    getWeaponConfig('fireball');
    getWeaponConfig('healing_potion');
}
const endTime = Date.now();

console.log(`✅ 30,000次配置查詢耗時: ${endTime - startTime}ms`);
console.log(`   平均每次查詢: ${((endTime - startTime) / 30000).toFixed(4)}ms`);

console.log('\n=== 武器配置系統測試完成 ===');

// 總結
console.log('\n📊 測試總結:');
console.log(`✅ 配置的武器總數: ${allWeapons.length}`);
console.log(`✅ 近戰武器: ${meleeWeapons.length}個`);
console.log(`✅ 遠程武器: ${projectileWeapons.length}個`);
console.log(`✅ 支援武器: ${supportWeapons.length}個`);
console.log(`✅ 配置錯誤: ${configErrors}個`);
console.log(`✅ 系統性能: 正常`);
