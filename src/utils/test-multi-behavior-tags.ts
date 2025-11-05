/**
 * 測試多個行為標籤的排序功能
 */

import { sortTags, validateTagOrder } from './TagOrderValidator';

// 測試多個行為標籤的例子
const testCases = [
    // 多個行為標籤 + 其他層標籤
    'explosive,fire,projectile,piercing,aoe,burn',

    // 多個行為標籤按定義順序
    'fire,projectile,melee,homing,bouncing,aoe',

    // 混亂順序的多行為標籤
    'chain,fire,explosive,projectile,on_hit,aoe',

    // 包含多個觸發類型的行為標籤
    'ice,on_hit,on_crit,on_death,piercing,instant',

    // 複雜的多行為組合
    'lightning,projectile,homing,chain,piercing,on_crit,aoe,stun'
];

console.log('🧪 測試多個行為標籤的排序功能:\n');

testCases.forEach((tags, index) => {
    console.log(`📝 測試案例 ${index + 1}:`);
    console.log(`   原始標籤: ${tags}`);

    const sorted = sortTags(tags);
    console.log(`   排序結果: ${sorted}`);

    const validation = validateTagOrder(tags);
    if (validation.valid) {
        console.log(`   ✅ 順序正確`);
    } else {
        console.log(`   ❌ 順序錯誤`);
        console.log(`   建議修正: ${validation.suggestion}`);
    }
    console.log('');
});

// 驗證行為標籤內部排序邏輯
console.log('🔍 行為標籤內部排序分析:');
console.log('   projectile → melee → ranged (攻擊類型)');
console.log('   homing → bouncing → piercing → chain → explosive (運動特性)');
console.log('   on_hit → on_death → on_cast → on_crit (觸發方式)');
console.log('');

// 實際 POE 風格的複雜組合
const poeStyleExamples = [
    // 火焰爆炸投射物
    'fire,projectile,explosive,aoe,burn',

    // 閃電連鎖穿透
    'lightning,projectile,piercing,chain,on_hit,stun',

    // 寒冰追蹤彈跳
    'ice,projectile,homing,bouncing,on_crit,freeze',

    // 物理近戰暴擊
    'physical,melee,on_crit,knockback,instant'
];

console.log('🎮 POE 風格實際範例:');
poeStyleExamples.forEach((example, index) => {
    console.log(`   範例 ${index + 1}: ${example}`);
    console.log(`   排序後: ${sortTags(example)}`);
});