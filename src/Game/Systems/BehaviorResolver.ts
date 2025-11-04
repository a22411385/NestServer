import { WeaponModifier } from '@/Types/Equipment/WeaponPropertyTypes';
import { Behavior } from './HitHandler';

/**
 * 🎯 行為解析器 - POE 風格
 * 
 * 從 WeaponModifiers（詞綴）解析出 HitHandler 需要的 Behaviors
 * 類似 POE 的輔助寶石系統：
 * - 標籤 (tags) = 特徵標記，用於匹配和條件判斷
 * - 詞綴 (modifiers) = 行為模組，定義具體效果
 * - 武器 = 標籤 + 詞綴的組合
 * 
 * 📝 設計哲學：
 * - 詞綴檢查武器的標籤來決定是否生效
 * - 詞綴可以組合使用（模組化）
 * - 詞綴可以在不同武器上復用
 * 
 * 🔧 使用範例：
 * ```typescript
 * const behaviors = BehaviorResolver.getBehaviorsFromModifiers(
 *     weapon.modifiers,
 *     weapon.tags
 * );
 * 
 * hitHandler.handle({
 *     ...
 *     behaviors: behaviors
 * });
 * ```
 */
export class BehaviorResolver {
    /**
     * 從 WeaponModifiers 解析出 Behaviors
     * 
     * @param modifiers 武器詞綴列表
     * @param weaponTags 武器標籤列表（用於條件判斷）
     * @returns Behavior 列表
     */
    public static getBehaviorsFromModifiers(
        modifiers: WeaponModifier[],
        weaponTags: string[]
    ): Behavior[] {
        const behaviors: Behavior[] = [];

        console.log(`🔧 [BehaviorResolver] 解析詞綴: ${modifiers.length} 個, 武器標籤: [${weaponTags.join(',')}]`);

        for (const modifier of modifiers) {
            // 檢查詞綴是否啟用
            if (!modifier.enabled) {
                console.log(`❌ [BehaviorResolver] 詞綴 ${modifier.id} 未啟用，跳過`);
                continue;
            }

            console.log(`🔍 [BehaviorResolver] 處理詞綴: ${modifier.id}, 標籤: [${modifier.tags}]`);

            // 根據詞綴類型解析為 Behavior
            const behavior = this.modifierToBehavior(modifier, weaponTags);
            if (behavior) {
                console.log(`✅ [BehaviorResolver] 生成行為: ${behavior.action}, 觸發: ${behavior.trigger}`);
                behaviors.push(behavior);
            } else {
                console.log(`⚠️ [BehaviorResolver] 詞綴 ${modifier.id} 未生成行為`);
            }
        }

        console.log(`🎯 [BehaviorResolver] 最終生成 ${behaviors.length} 個行為`);
        return behaviors;
    }

    /**
     * 將單個 WeaponModifier 轉換為 Behavior
     * 
     * 🎯 設計模式：
     * 1. 檢查詞綴的 tags 是否與武器的 tags 匹配
     * 2. 根據詞綴的 id 或 affectedStat 決定 behavior.action
     * 3. 使用詞綴的 baseValue 作為 behavior.config 的參數
     */
    private static modifierToBehavior(
        modifier: WeaponModifier,
        weaponTags: string[]
    ): Behavior | null {
        const modifierTags = modifier.tags.split(',').map(t => t.trim());

        // ========================================
        // 1️⃣ 穿透 (Pierce)
        // ========================================
        if (modifier.id === 'piercing' || modifier.id === 'pierce_count') {
            // 檢查武器是否是投射物
            if (!this.hasAnyTag(weaponTags, ['projectile'])) {
                console.warn(`⚠️ 詞綴 ${modifier.id} 需要 'projectile' 標籤，但武器沒有`);
                return null;
            }

            // 穿透是投射物的內建行為，不需要通過 Behavior 系統處理
            // pierceCount 已經在 ServerBullet 中處理
            return null;
        }

        // ========================================
        // 2️⃣ 連鎖攻擊 (Chain)
        // ========================================
        if (modifier.id === 'chain_attack') {
            // 檢查武器是否是投射物
            if (!this.hasAnyTag(weaponTags, ['projectile'])) {
                console.warn(`⚠️ 詞綴 ${modifier.id} 需要 'projectile' 標籤，但武器沒有`);
                return null;
            }

            return {
                trigger: 'onHit',
                action: 'chain',
                config: {
                    chainCount: Math.floor(modifier.baseValue), // 連鎖次數
                    chainRange: 200, // 連鎖範圍（可從另一個 modifier 讀取）
                }
            };
        }

        // ========================================
        // 3️⃣ 濺射傷害 / AOE 爆炸 (Splash / AOE)
        // ========================================
        if (modifier.id === 'splash_damage' || this.hasAnyTag(modifierTags, ['area', 'aoe', 'splash'])) {
            // AOE 可以用於投射物或近戰
            // ⚠️ 注意：radius 和 damageMultiplier 會在 HitHandler 中使用 BonusCalculator 動態計算
            // 這裡只提供基礎配置值
            return {
                trigger: 'onHit',
                action: 'aoeExplode',
                config: {
                    radius: modifier.id === 'area_of_effect' ? modifier.baseValue : 100, // 基礎半徑
                    damageMultiplier: modifier.id === 'splash_damage' ? modifier.baseValue / 100 : 0.5, // 基礎倍率
                }
            };
        }

        // ========================================
        // 4️⃣ 分裂 (Fork/Split)
        // ========================================
        if (modifier.id === 'fork' || modifier.id === 'split') {
            // 檢查武器是否是投射物
            if (!this.hasAnyTag(weaponTags, ['projectile'])) {
                console.warn(`⚠️ 詞綴 ${modifier.id} 需要 'projectile' 標籤，但武器沒有`);
                return null;
            }

            return {
                trigger: 'onHit',
                action: 'split',
                config: {
                    count: Math.floor(modifier.baseValue) || 2, // 分裂數量
                    spreadAngle: 60, // 分裂角度（可配置）
                    childDamageMultiplier: 0.7, // 子彈傷害倍率（可配置）
                    childTags: modifier.tags, // 子彈繼承標籤
                }
            };
        }

        // ========================================
        // 5️⃣ 擊退 (Knockback)
        // ========================================
        if (modifier.id === 'knockback') {
            // 擊退透過 StatusEffect 系統處理，不需要 Behavior
            // CombatSystem 會自動從 modifier 生成 knockback statusEffect
            return null;
        }

        // ========================================
        // 6️⃣ 暴擊時觸發 (On Crit)
        // ========================================
        if (this.hasAnyTag(modifierTags, ['critical', 'on_crit'])) {
            // 暴擊觸發的行為（例如：暴擊時爆炸）
            return {
                trigger: 'onCrit',
                action: 'aoeExplode',
                config: {
                    radius: 100,
                    damageMultiplier: 0.5,
                }
            };
        }

        // ========================================
        // 7️⃣ 擊殺時觸發 (On Kill)
        // ========================================
        if (this.hasAnyTag(modifierTags, ['on_kill'])) {
            // 擊殺觸發的行為（例如：擊殺時爆炸）
            return {
                trigger: 'onKill',
                action: 'aoeExplode',
                config: {
                    radius: 150,
                    damageMultiplier: 1.0,
                }
            };
        }

        // ========================================
        // 8️⃣ 其他類型的詞綴（不產生 Behavior）
        // ========================================
        // 某些詞綴只影響數值，不產生行為：
        // - critical_chance, critical_damage -> 影響暴擊系統
        // - life_steal -> 影響生命偷取
        // - attack_damage -> 影響基礎傷害
        // - projectile_speed -> 影響投射物速度
        // 這些詞綴由其他系統處理（BonusCalculator, DamageSystem 等）

        return null;
    }

    /**
     * 檢查標籤列表中是否包含任一目標標籤
     */
    private static hasAnyTag(tags: string[], targetTags: string[]): boolean {
        return targetTags.some(target => tags.includes(target));
    }

    /**
     * 🆕 便捷方法：從武器 Schema 直接獲取 Behaviors
     * 
     * @param weapon 武器 Schema（需要有 modifiers 和 tags）
     */
    public static getBehaviorsFromWeapon(weapon: {
        modifiers: WeaponModifier[];
        tags: string[];
    }): Behavior[] {
        return this.getBehaviorsFromModifiers(weapon.modifiers, weapon.tags);
    }

    /**
     * 🆕 便捷方法：從子彈的標籤和詞綴獲取 Behaviors
     * 
     * @param modifiers 子彈的詞綴
     * @param tags 子彈的標籤
     */
    public static getBehaviorsFromBullet(
        modifiers: WeaponModifier[],
        tags: string[]
    ): Behavior[] {
        return this.getBehaviorsFromModifiers(modifiers, tags);
    }
}
