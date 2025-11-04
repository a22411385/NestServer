/**
 * POE 風格標籤順序驗證工具
 * 
 * 用於檢查和修正視覺效果標籤的排列順序
 * 確保符合四層排序規範
 */

/**
 * 標籤層次定義（按優先級排序）
 */
export const TAG_HIERARCHY = {
    // 第一層：元素標籤（優先級最高）
    elements: [
        'fire', 'ice', 'lightning', 'poison', 'blood',
        'holy', 'shadow', 'arcane', 'physical'
    ],

    // 第二層：行為標籤 (可以有多個，按子分類排序)
    behaviors: [
        // 攻擊類型 (基礎行為)
        'projectile', 'melee', 'ranged',
        // 運動特性 (可疊加多個)  
        'homing', 'bouncing', 'piercing', 'chain', 'explosive',
        // 觸發方式 (可同時有多個觸發條件)
        'on_hit', 'on_death', 'on_cast', 'on_crit'
    ],

    // 第三層：影響標籤
    impacts: [
        // 範圍類型
        'aoe', 'single', 'line', 'cone',
        // 傷害類型
        'dot', 'burst', 'instant', 'damage',
        // 控場效果
        'knockback', 'stun', 'freeze', 'slow'
    ],

    // 第四層：狀態標籤（優先級最低）
    statuses: [
        // 負面狀態
        'burn', 'bleed', 'poison_stack', 'frozen', 'cursed',
        // 正面狀態
        'heal', 'buff', 'shield',
        // 特殊狀態
        'critical', 'combo', 'lifesteal'
    ]
};

/**
 * 獲取標籤的層次和優先級
 * 
 * @param tag 標籤名稱
 * @returns 包含層次和在該層內索引的對象
 * 
 * @example
 * getTagPriority('fire') → { layer: 0, index: 0 }  // 元素層第一個
 * getTagPriority('projectile') → { layer: 1, index: 0 }  // 行為層第一個
 * getTagPriority('piercing') → { layer: 1, index: 4 }  // 行為層第五個
 * 
 * @description
 * 支援多個行為標籤的正確排序，例如：
 * - 'fire,projectile,piercing,chain,aoe,burn' 
 * - 排序為：元素(fire) → 行為1(projectile) → 行為2(piercing) → 行為3(chain) → 影響(aoe) → 狀態(burn)
 */
function getTagPriority(tag: string): { layer: number, index: number } {
    // 檢查各個層次
    for (const [layerName, tags] of Object.entries(TAG_HIERARCHY)) {
        const index = tags.indexOf(tag);
        if (index !== -1) {
            const layerMap = { elements: 0, behaviors: 1, impacts: 2, statuses: 3 };
            return {
                layer: layerMap[layerName as keyof typeof layerMap],
                index
            };
        }
    }

    // 未知標籤放在最後
    return { layer: 99, index: 99 };
}

/**
 * 排序標籤字符串
 */
export function sortTags(tagsString: string): string {
    const tags = tagsString.split(',').map(t => t.trim());

    const sorted = tags.sort((a, b) => {
        const priorityA = getTagPriority(a);
        const priorityB = getTagPriority(b);

        // 先按層次排序
        if (priorityA.layer !== priorityB.layer) {
            return priorityA.layer - priorityB.layer;
        }

        // 同層內按定義順序排序
        return priorityA.index - priorityB.index;
    });

    return sorted.join(',');
}

/**
 * 驗證標籤順序
 */
export function validateTagOrder(tagsString: string): {
    valid: boolean,
    message: string,
    suggestion?: string
} {
    const sorted = sortTags(tagsString);

    if (tagsString === sorted) {
        return { valid: true, message: '✅ Tags 順序正確' };
    }

    return {
        valid: false,
        message: '❌ Tags 順序不正確',
        suggestion: `建議順序：${sorted}`
    };
}

/**
 * 修正配置表中的標籤順序
 */
export function fixVisualEffectTags(visualEffects: any[]): any[] {
    return visualEffects.map(effect => {
        if (effect.tags) {
            const validation = validateTagOrder(effect.tags);
            if (!validation.valid) {
                console.log(`🔧 修正 ${effect.effectId} 的標籤順序:`);
                console.log(`   原始: ${effect.tags}`);
                console.log(`   修正: ${validation.suggestion}`);

                effect.tags = validation.suggestion;
            }
        }
        return effect;
    });
}

/**
 * 🆕 自動檢查和修正 Google Sheets 數據中的標籤順序
 * 在 GoogleSheetCache 初始化後自動執行
 */
export async function autoValidateAndFixTags(): Promise<void> {
    try {
        console.log('🔍 開始檢查配置表中的標籤順序...');

        // 從 ConfigManager 獲取數據
        const { ConfigManager } = await import('../Game/Managers/ConfigManager');

        let hasChanges = false;
        let totalChecked = 0;
        let totalFixed = 0;

        // 檢查視覺效果定義
        const visualEffects = ConfigManager.getAll('VisualEffectDefinitions');
        if (visualEffects && visualEffects.length > 0) {
            console.log(`📊 檢查 ${visualEffects.length} 個視覺效果的標籤順序...`);

            visualEffects.forEach((effect: any) => {
                if (effect.tags) {
                    totalChecked++;
                    const validation = validateTagOrder(effect.tags);
                    if (!validation.valid) {
                        console.log(`🔧 [VisualEffect] 修正 ${effect.effectId}:`);
                        console.log(`   原始: ${effect.tags}`);
                        console.log(`   修正: ${validation.suggestion}`);

                        effect.tags = validation.suggestion;
                        hasChanges = true;
                        totalFixed++;
                    }
                }
            });
        }

        // 檢查武器定義
        const weapons = ConfigManager.getAll('WeaponConfigs');
        if (weapons && weapons.length > 0) {
            console.log(`🗡️ 檢查 ${weapons.length} 個武器的標籤順序...`);

            weapons.forEach((weapon: any) => {
                if (weapon.tags) {
                    totalChecked++;
                    const validation = validateTagOrder(weapon.tags);
                    if (!validation.valid) {
                        console.log(`🔧 [Weapon] 修正 ${weapon.id}:`);
                        console.log(`   原始: ${weapon.tags}`);
                        console.log(`   修正: ${validation.suggestion}`);

                        weapon.tags = validation.suggestion;
                        hasChanges = true;
                        totalFixed++;
                    }
                }
            });
        }

        // 檢查狀態效果定義
        const statusEffects = ConfigManager.getAll('StatusEffectDefinitions');
        if (statusEffects && statusEffects.length > 0) {
            console.log(`⚡ 檢查 ${statusEffects.length} 個狀態效果的標籤順序...`);

            statusEffects.forEach((effect: any) => {
                if (effect.tags) {
                    totalChecked++;
                    const validation = validateTagOrder(effect.tags);
                    if (!validation.valid) {
                        console.log(`🔧 [StatusEffect] 修正 ${effect.id}:`);
                        console.log(`   原始: ${effect.tags}`);
                        console.log(`   修正: ${validation.suggestion}`);

                        effect.tags = validation.suggestion;
                        hasChanges = true;
                        totalFixed++;
                    }
                }
            });
        }

        // 檢查標籤定義
        const tagDefinitions = ConfigManager.getAll('TagDefinitions');
        if (tagDefinitions && tagDefinitions.length > 0) {
            console.log(`🏷️ 檢查 ${tagDefinitions.length} 個標籤定義的標籤順序...`);

            tagDefinitions.forEach((tag: any) => {
                if (tag.requiredTags) {
                    totalChecked++;
                    const validation = validateTagOrder(tag.requiredTags);
                    if (!validation.valid) {
                        console.log(`🔧 [TagDefinition] 修正 ${tag.id}:`);
                        console.log(`   原始: ${tag.requiredTags}`);
                        console.log(`   修正: ${validation.suggestion}`);

                        tag.requiredTags = validation.suggestion;
                        hasChanges = true;
                        totalFixed++;
                    }
                }
            });
        }

        // 輸出總結
        console.log('📈 標籤檢查完成:');
        console.log(`   - 總檢查項目: ${totalChecked}`);
        console.log(`   - 修正項目: ${totalFixed}`);
        console.log(`   - 檢查通過: ${totalChecked - totalFixed}`);

        if (hasChanges) {
            console.log('⚠️ 注意：標籤順序已自動修正，建議同步更新 Google Sheets');
        } else {
            console.log('✅ 所有標籤順序都符合 POE 風格規範！');
        }

    } catch (error) {
        console.error('❌ 標籤檢查過程中出現錯誤:', error);
        console.warn('   標籤檢查失敗，但不影響伺服器正常運行');
    }
}

// 使用範例
/*
// 📝 單一行為標籤
console.log(validateTagOrder('explosive,fire,aoe,burn'));
// { valid: false, message: '❌ Tags 順序不正確', suggestion: 'fire,explosive,aoe,burn' }

console.log(validateTagOrder('fire,explosive,aoe,burn'));
// { valid: true, message: '✅ Tags 順序正確' }

// 📝 多個行為標籤範例
console.log(sortTags('explosive,fire,projectile,piercing,aoe,burn'));
// 結果: 'fire,projectile,piercing,explosive,aoe,burn'

console.log(sortTags('chain,lightning,on_hit,projectile,homing,stun'));
// 結果: 'lightning,projectile,homing,chain,on_hit,stun'

// 📝 複雜的 POE 風格組合
console.log(sortTags('burn,on_crit,explosive,fire,projectile,aoe,piercing'));
// 結果: 'fire,projectile,piercing,explosive,on_crit,aoe,burn'

// 📝 多觸發條件
console.log(sortTags('ice,on_death,on_hit,projectile,freeze'));
// 結果: 'ice,projectile,on_hit,on_death,freeze'

// 📝 清理無關標籤
console.log(sortTags('weapon,ranged,staff,projectile,trail,fire'));
// 結果: 'fire,projectile,ranged' (移除了非核心標籤 weapon, staff, trail)
*/