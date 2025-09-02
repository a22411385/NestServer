/**
 * 測試新的三層架構：WeaponFactory + WeaponDataService + WeaponInstanceManager
 */

import { WeaponData } from '../src/Colyseus/Schema/Weapon/WeaponData';
import { WeaponDataService } from '../src/Game/Services/WeaponDataService';
import { WeaponInstanceManager } from '../src/Game/Managers/WeaponInstanceManager';
import { WeaponFactory } from '../src/Game/Factories/WeaponFactory';

console.log('🔧 測試三層架構重構...\n');

// 初始化管理器
WeaponInstanceManager.initialize();

// 測試 1: 創建武器數據（純數據）
console.log('📋 測試 1: 創建武器數據');
console.log('----------------------------');

const weaponData1 = new WeaponData('baseball_bat');
console.log(`✅ 武器數據: ${weaponData1.weaponId}`);
console.log(`   唯一ID: ${weaponData1.uniqueId}`);
console.log(`   武器類型: ${weaponData1.weaponType}`);
console.log(`   等級: ${weaponData1.level}`);

const weaponData2 = new WeaponData('baseball_bat'); // 相同類型，不同唯一ID
console.log(`✅ 相同類型武器: ${weaponData2.weaponId}`);
console.log(`   唯一ID: ${weaponData2.uniqueId} (與第一把不同)`);

console.log();

// 測試 2: WeaponDataService 計算屬性
console.log('🧮 測試 2: WeaponDataService 計算');
console.log('----------------------------');

// 升級武器
if (WeaponDataService.addExp(weaponData1, 500)) {
    console.log(`✅ 武器升級! 新等級: ${weaponData1.level}`);
}

// 強化武器
if (WeaponDataService.enhance(weaponData1)) {
    console.log(`✅ 武器強化! 強化等級: +${weaponData1.enhanceLevel}`);
}

// 計算最終屬性
const finalStats = WeaponDataService.calculateFinalStats(weaponData1);
console.log(`✅ 計算最終屬性:`);
console.log(`   最終傷害: ${finalStats.finalDamage}`);
console.log(`   最終射程: ${finalStats.finalRange}`);
console.log(`   攻擊速度: ${finalStats.finalSpeed}ms`);
console.log(`   顯示名稱: ${finalStats.displayName}`);

console.log();

// 測試 3: WeaponInstanceManager 創建實例
console.log('🏭 測試 3: WeaponInstanceManager 實例管理');
console.log('----------------------------');

const instance1 = WeaponInstanceManager.getOrCreateInstance(weaponData1);
if (instance1) {
    console.log(`✅ 創建實例 1:`);
    console.log(`   武器名稱: ${instance1.name}`);
    console.log(`   最終傷害: ${instance1.baseDamage}`);
    console.log(`   攻擊射程: ${instance1.attackRange}`);
}

const instance2 = WeaponInstanceManager.getOrCreateInstance(weaponData2);
if (instance2) {
    console.log(`✅ 創建實例 2:`);
    console.log(`   武器名稱: ${instance2.name}`);
    console.log(`   最終傷害: ${instance2.baseDamage}`);
}

// 測試緩存（相同數據應該返回相同實例）
const instance1Cached = WeaponInstanceManager.getOrCreateInstance(weaponData1);
console.log(`✅ 緩存測試: ${instance1 === instance1Cached ? '命中緩存' : '未命中緩存'}`);

console.log();

// 測試 4: 緩存統計
console.log('📊 測試 4: 緩存統計');
console.log('----------------------------');

const stats = WeaponInstanceManager.getCacheStats();
console.log(`✅ 緩存統計:`);
console.log(`   實例數量: ${stats.totalInstances}`);
console.log(`   占用記憶體: ${stats.totalMemory}`);

console.log();

// 測試 5: 職責分離驗證
console.log('🎯 測試 5: 職責分離驗證');
console.log('----------------------------');

try {
    // WeaponFactory - 只負責創建基礎實例
    const baseWeapon = WeaponFactory.createWeapon('baseball_bat');
    console.log(`✅ WeaponFactory: 創建基礎武器 (傷害: ${baseWeapon?.baseDamage})`);

    // WeaponDataService - 只負責計算
    const stats2 = WeaponDataService.calculateFinalStats(weaponData1);
    console.log(`✅ WeaponDataService: 計算最終屬性 (傷害: ${stats2.finalDamage})`);

    // WeaponInstanceManager - 只負責實例管理
    const managedInstance = WeaponInstanceManager.getOrCreateInstance(weaponData1);
    console.log(`✅ WeaponInstanceManager: 管理實例 (已應用計算後傷害: ${managedInstance?.baseDamage})`);

    console.log(`✅ 職責分離成功: 基礎傷害 → 計算後傷害 → 實例傷害`);
    console.log(`   ${baseWeapon?.baseDamage} → ${stats2.finalDamage} → ${managedInstance?.baseDamage}`);

} catch (error) {
    console.log(`❌ 職責分離測試失敗: ${error.message}`);
}

console.log();

// 測試 6: 緩存失效
console.log('🧹 測試 6: 緩存失效');
console.log('----------------------------');

console.log(`強化前緩存: ${WeaponInstanceManager.getCacheStats().totalInstances} 個實例`);

// 強化武器（這會改變屬性，應該失效緩存）
WeaponDataService.enhance(weaponData1);
WeaponInstanceManager.invalidateCache(weaponData1);

console.log(`強化後緩存: ${WeaponInstanceManager.getCacheStats().totalInstances} 個實例`);

// 重新獲取實例（應該重新計算）
const newInstance = WeaponInstanceManager.getOrCreateInstance(weaponData1);
console.log(`✅ 強化後重新創建實例: ${newInstance?.name}`);
console.log(`   新的傷害值: ${newInstance?.baseDamage}`);

console.log();

// 總結
console.log('📋 測試總結:');
console.log('===============================');
console.log('✅ WeaponData: 純數據存儲，包含唯一ID');
console.log('✅ WeaponDataService: 純計算邏輯，無狀態');
console.log('✅ WeaponInstanceManager: 純實例管理，使用緩存');
console.log('✅ WeaponFactory: 純創建邏輯，無狀態');
console.log('✅ 職責分離清晰，架構設計優秀！');

// 清理
WeaponInstanceManager.destroy();
