import { ConfigManager } from "@/Game/Managers/ConfigManager";

/**
 * 🔥 效果工具類 - 統一管理效果類型的轉換邏輯
 * 
 * 🎯 職責：
 * - 提供效果類型 → 元素標籤的轉換（✅ 從配置表讀取）
 * - 提供效果類型 → 防禦計算類型的轉換（✅ 從配置表讀取）
 * - 集中管理效果配置，避免邏輯散落
 * 
 * 📌 使用場景：
 * - StatusEffectSystem: 計算 DOT 傷害時
 * - CombatSystem: 武器攻擊施加效果時
 * - WeaponConfig: 武器效果配置時
 * - SkillSystem: 技能效果配置時
 * 
 * ✅ 改進：
 * - 從 Google Sheets (StatusEffectDefinitions) 讀取配置
 * - 不再使用硬編碼的 switch case
 * - 支援動態新增效果類型
 */
export class EffectHelper {
    /**
     * 🔥 根據效果類型獲取元素標籤（✅ 從配置表讀取）
     * 
     * @param effectType 效果類型（如 'burn', 'poison', 'bleed'）
     * @returns 元素標籤陣列（用於匹配 Hero 的元素傷害加成）
     * 
     * @example
     * // 配置表設置: burn.elementTags = "fire"
     * getElementTags('burn')   => ['fire']
     * 
     * // 配置表設置: flame_punch.elementTags = "physical,fire"
     * getElementTags('flame_punch') => ['physical', 'fire']
     */
    static getElementTags(effectType: string): string[] {
        const effectDef = ConfigManager.getById<import('@/Types/Equipment/WeaponPropertyTypes').StatusEffectDefinition>(
            'StatusEffectDefinitions',
            effectType
        );

        if (effectDef && effectDef.elementTags) {
            // 解析逗號分隔的字串 → 陣列
            return effectDef.elementTags
                .split(',')
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag.length > 0);
        }

        // ⚠️ 找不到配置時的預設值
        console.warn(`⚠️ 效果 '${effectType}' 未配置 elementTags，使用預設值 ['physical']`);
        return ['physical'];
    }

    /**
     * 🔥 根據效果類型決定防禦計算類型（✅ 從配置表讀取）
     * 
     * damageType 決定目標的防禦減免方式：
     * - 'physical': 扣除物理防禦（physicalDefense）
     * - 'magic': 扣除魔法防禦（magicDefense）
     * - 'true': 無視防禦（真實傷害）
     * 
     * @param effectType 效果類型（如 'burn', 'bleed'）
     * @returns 防禦計算類型
     * 
     * @example
     * // 配置表設置: burn.damageType = "magic"
     * getDamageType('burn')  => 'magic'
     * 
     * // 配置表設置: bleed.damageType = "physical"
     * getDamageType('bleed') => 'physical'
     */
    static getDamageType(effectType: string): 'physical' | 'magic' | 'true' {
        const effectDef = ConfigManager.getById<import('@/Types/Equipment/WeaponPropertyTypes').StatusEffectDefinition>(
            'StatusEffectDefinitions',
            effectType
        );

        if (effectDef && effectDef.damageType) {
            return effectDef.damageType;
        }

        // ⚠️ 找不到配置時的預設值
        console.warn(`⚠️ 效果 '${effectType}' 未配置 damageType，使用預設值 'physical'`);
        return 'physical';
    }

    /**
     * 🔥 檢查效果是否為 DOT（持續傷害）類型
     * 
     * @param effectType 效果類型
     * @returns 是否為 DOT 效果
     */
    static isDamageOverTime(effectType: string): boolean {
        const dotEffects = [
            'burn', 'ignite',
            'poison',
            'bleed', 'rupture', 'lacerate',
            'shock',
            // 可擴展更多 DOT 類型
        ];
        return dotEffects.includes(effectType.toLowerCase());
    }

    /**
     * 🔥 檢查效果是否為控制類型
     * 
     * @param effectType 效果類型
     * @returns 是否為控制效果
     */
    static isCrowdControl(effectType: string): boolean {
        const ccEffects = [
            'stun',
            'freeze',
            'root',
            'slow',
            'knockback',
            'knockdown',
            'airborne',
            'silence',
            'blind',
            // 可擴展更多控制類型
        ];
        return ccEffects.includes(effectType.toLowerCase());
    }

    /**
     * 🔥 獲取效果的預設持續時間（毫秒）
     * 
     * @param effectType 效果類型
     * @returns 預設持續時間（毫秒），0 表示無預設
     * 
     * @example
     * getDefaultDuration('burn')   => 5000   // 燃燒預設 5 秒
     * getDefaultDuration('stun')   => 1500   // 眩暈預設 1.5 秒
     * getDefaultDuration('custom') => 0      // 自訂效果無預設
     */
    static getDefaultDuration(effectType: string): number {
        switch (effectType.toLowerCase()) {
            // DOT 效果（較長持續時間）
            case "burn":
            case "ignite":
                return 5000; // 5 秒

            case "poison":
                return 6000; // 6 秒

            case "bleed":
                return 3000; // 3 秒

            case "shock":
                return 4000; // 4 秒

            // 控制效果（較短持續時間）
            case "stun":
                return 1500; // 1.5 秒

            case "freeze":
                return 2000; // 2 秒

            case "slow":
                return 3000; // 3 秒

            case "root":
                return 2500; // 2.5 秒

            case "knockback":
            case "knockdown":
                return 500; // 0.5 秒

            case "airborne":
                return 800; // 0.8 秒

            // 無預設持續時間
            default:
                return 0;
        }
    }

    /**
     * 🔥 檢查效果是否可以疊加
     * 
     * @param effectType 效果類型
     * @returns 是否可疊加
     */
    static canStack(effectType: string): boolean {
        const stackableEffects = [
            'burn',
            'poison',
            'bleed',
            'shock',
            'slow', // 減速可疊加
            // 控制效果通常不可疊加
        ];
        return stackableEffects.includes(effectType.toLowerCase());
    }

    /**
     * 🔥 獲取效果的最大疊加層數
     * 
     * @param effectType 效果類型
     * @returns 最大疊加層數（0 表示不可疊加）
     */
    static getMaxStacks(effectType: string): number {
        switch (effectType.toLowerCase()) {
            case "burn":
            case "poison":
            case "bleed":
                return 10; // DOT 最多 10 層

            case "shock":
                return 5; // 電擊最多 5 層

            case "slow":
                return 3; // 減速最多 3 層

            // 控制效果不可疊加
            case "stun":
            case "freeze":
            case "root":
            case "knockback":
                return 1;

            default:
                return 0; // 預設不可疊加
        }
    }
}
