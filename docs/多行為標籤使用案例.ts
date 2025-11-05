/**
 * 多個行為標籤的實際使用案例說明
 * 
 * 📖 為什麼會有多個行為標籤？
 * 
 * 在 POE 風格的遊戲中，一個技能或武器效果經常會同時具備多種行為特性：
 */

// 🔥 範例 1: 火焰爆炸穿透投射物
const fireExplosivePiercing = 'fire,projectile,piercing,explosive,aoe,burn';
// 解析：
// - fire: 元素類型是火焰
// - projectile: 是投射物攻擊
// - piercing: 可以穿透敵人 (行為1)
// - explosive: 擊中後爆炸 (行為2) 
// - aoe: 造成範圍傷害
// - burn: 附加燃燒狀態

// ⚡ 範例 2: 閃電連鎖追蹤彈
const lightningChainHoming = 'lightning,projectile,homing,chain,on_hit,stun';
// 解析：
// - lightning: 元素類型是閃電
// - projectile: 是投射物攻擊
// - homing: 會追蹤目標 (行為1)
// - chain: 可以連鎖到其他敵人 (行為2)
// - on_hit: 擊中時觸發額外效果 (行為3)
// - stun: 造成眩暈效果

// 🧊 範例 3: 寒冰彈跳暴擊投射物
const iceBouncing = 'ice,projectile,bouncing,on_crit,freeze,slow';
// 解析：
// - ice: 元素類型是寒冰
// - projectile: 是投射物攻擊  
// - bouncing: 可以彈跳 (行為1)
// - on_crit: 暴擊時觸發 (行為2)
// - freeze: 造成冰凍效果
// - slow: 造成緩速效果

// 🗡️ 範例 4: 物理近戰多觸發
const physicalMelee = 'physical,melee,on_hit,on_crit,knockback,bleed';
// 解析：
// - physical: 元素類型是物理
// - melee: 是近戰攻擊
// - on_hit: 擊中時觸發 (行為1)
// - on_crit: 暴擊時觸發 (行為2) 
// - knockback: 造成擊退效果
// - bleed: 造成流血狀態

console.log('📋 多行為標籤實際案例:');
console.log('');

console.log('🔥 火焰爆炸穿透投射物:');
console.log(`   配置: ${fireExplosivePiercing}`);
console.log('   效果: 發射火焰投射物 → 穿透敵人 → 擊中後爆炸 → 範圍燃燒傷害');
console.log('');

console.log('⚡ 閃電連鎖追蹤彈:');
console.log(`   配置: ${lightningChainHoming}`);
console.log('   效果: 發射追蹤彈 → 自動尋敵 → 擊中後連鎖 → 造成眩暈');
console.log('');

console.log('🧊 寒冰彈跳暴擊:');
console.log(`   配置: ${iceBouncing}`);
console.log('   效果: 發射寒冰彈 → 可以彈跳 → 暴擊時冰凍 → 附加緩速');
console.log('');

console.log('🗡️ 物理近戰組合:');
console.log(`   配置: ${physicalMelee}`);
console.log('   效果: 近戰攻擊 → 擊中擊退 → 暴擊流血 → 雙重觸發機制');
console.log('');

console.log('💡 設計原則:');
console.log('   1. 一個元素標籤 (火/冰/雷等)');
console.log('   2. 一個攻擊類型 (投射物/近戰/遠程)');
console.log('   3. 多個運動特性 (穿透+爆炸, 追蹤+連鎖, 彈跳等)');
console.log('   4. 多個觸發條件 (擊中時+暴擊時)');
console.log('   5. 多個影響效果 (範圍+單體)');
console.log('   6. 多個狀態效果 (燃燒+緩速, 冰凍+眩暈等)');

export {
    fireExplosivePiercing,
    lightningChainHoming,
    iceBouncing,
    physicalMelee
};