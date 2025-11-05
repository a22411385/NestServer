import { ServerGameUnit } from '@/Colyseus/Schema/Unit/GameUnit';
import { ServerHero } from '@/Colyseus/Schema/Unit/Hero';

/**
 * 加成分類結果（POE 風格）
 */
export interface BonusBreakdown {
    flat: number;       // 固定值總和
    increased: number;  // 百分比加成總和（加法疊加）
    more: number;       // 百分比乘法總和（乘法疊加）
}

/**
 * 🎯 統一的屬性加成計算器（POE 風格）
 * 
 * 用途：從多個來源收集屬性加成並按 modifierType 分類
 * 來源：
 * 1. 武器屬性 (properties)
 * 2. 天賦系統 (TODO)
 * 3. 狀態效果 (TODO)
 * 4. 裝備 (TODO)
 * 
 * 支援的屬性 ID：
 * 查閱 google-sheets WeaponStatConfigs 配置
 * 
 * @example
 * ```typescript
 * const bonus = BonusCalculator.getPropertyBonus('area_of_effect', hero);
 * const finalRadius = (baseRadius + bonus.flat) * (1 + bonus.increased) * bonus.more;
 * ```
 */
export class BonusCalculator {
    /**
     * 統一的屬性加成獲取方法（POE 風格）
     * 
     * @param propertyId 屬性ID（例如 'area_of_effect', 'critical_chance'）
     * @param unit 單位（英雄或敵人）
     * @returns BonusBreakdown - 分類的加成數據
     */
    public static getPropertyBonus(propertyId: string, unit: ServerGameUnit): BonusBreakdown {
        const result: BonusBreakdown = {
            flat: 0,
            increased: 0,
            more: 1, // MORE 是乘法，初始值為 1
        };

        // 只處理英雄單位
        if (unit.type !== 1) { // UnitType.hero = 1
            return result;
        }

        const hero = unit as ServerHero;

        // 1️⃣ 收集武器屬性加成 (從 attributeBonuses)
        this.collectWeaponBonuses(hero, propertyId, result);

        // 2️⃣ 收集天賦加成 (TODO: 需要天賦系統實現)
        // this.collectTalentBonuses(hero, propertyId, result);

        // 3️⃣ 收集狀態效果加成 (TODO: 需要狀態效果系統擴展)
        // this.collectStatusEffectBonuses(hero, propertyId, result);

        return result;
    }

    /**
     * 🎯 從武器收集屬性加成
     */
    private static collectWeaponBonuses(
        hero: ServerHero,
        propertyId: string,
        result: BonusBreakdown
    ): void {
        // 遍歷所有已裝備的武器
        for (const weaponSchema of hero.weaponInventory) {
            // 只處理已裝備的武器
            if (!weaponSchema.isEquipped) {
                continue;
            }

            try {
                // 🆕 獲取統一的武器詞綴 (WeaponMods)
                const weaponMods = weaponSchema.getWeaponMods();
                if (!weaponMods || weaponMods.length === 0) {
                    continue;
                }

                // 遍歷所有詞綴，找到影響目標屬性的修改器
                for (const mod of weaponMods) {
                    if (!mod.enabled) continue;

                    // 檢查是否影響目標屬性（現在是扁平結構）
                    if (!mod.affectedStat || mod.affectedStat !== propertyId) {
                        continue;
                    }

                    // 🆕 將 mod 轉換為舊的 bonus 格式以相容現有邏輯
                    const bonusLike = {
                        id: mod.id,
                        enabled: mod.enabled,
                        affectedStat: mod.affectedStat,
                        baseValue: mod.value, // 使用 value 作為 baseValue
                        modifierType: mod.modifierType,
                        category: mod.category
                    };

                    // 根據修改器類型累加到對應分類
                    this.addBonusToBreakdown(result, bonusLike);
                }
            } catch (error) {
                // 靜默處理解析錯誤，不影響其他武器
                console.warn(`⚠️ 解析武器詞綴失敗: ${weaponSchema.weaponId}`, error);
            }
        }
    }

    /**
     * 🎯 將單個加成添加到 BonusBreakdown
     */
    private static addBonusToBreakdown(
        breakdown: BonusBreakdown,
        bonus: any
    ): void {
        const value = bonus.baseValue || 0;
        const modifierType = (bonus.modifierType || 'flat').toLowerCase();

        switch (modifierType) {
            case 'flat':
                breakdown.flat += value;
                break;

            case 'increased':
                // 百分比加成，轉換為小數 (例如: 20 → 0.2)
                breakdown.increased += value / 100;
                break;

            case 'more':
                // MORE 是乘法疊加 (例如: 1.0 * 1.2 * 1.15)
                breakdown.more *= (1 + value / 100);
                break;

            default:
                console.warn(`⚠️ 未知的修改器類型: ${modifierType}`);
        }
    }

    /**
     * 🎯 應用 POE 公式計算最終值
     * 
     * 公式：最終值 = (基礎值 + FLAT) × (1 + INCREASED) × MORE
     * 
     * @param baseValue 基礎值
     * @param bonus 加成分類
     * @param debugLabel 調試標籤（用於日誌輸出）
     * @returns 最終計算值
     */
    public static applyBonus(
        baseValue: number,
        bonus: BonusBreakdown,
        debugLabel?: string
    ): number {
        const finalValue = (baseValue + bonus.flat) * (1 + bonus.increased) * bonus.more;

        // 調試日誌（可選）
        if (debugLabel && (bonus.flat !== 0 || bonus.increased !== 0 || bonus.more !== 1)) {
            console.log(
                `🎯 [${debugLabel}] 基礎: ${baseValue} + ${bonus.flat.toFixed(0)} → ` +
                `×(1+${(bonus.increased * 100).toFixed(0)}%) ×${bonus.more.toFixed(2)} = ${finalValue.toFixed(1)}`
            );
        }

        return finalValue;
    }

    /**
     * 🎯 應用 POE 公式計算最終值（冷卻縮減專用）
     * 
     * 公式：最終冷卻 = (基礎冷卻 + FLAT) × (1 - INCREASED) × MORE
     * 注意：冷卻縮減的 INCREASED 是減法
     */
    public static applyCooldownBonus(
        baseValue: number,
        bonus: BonusBreakdown,
        debugLabel?: string
    ): number {
        const finalValue = (baseValue + bonus.flat) * (1 - bonus.increased) * bonus.more;

        if (debugLabel && (bonus.flat !== 0 || bonus.increased !== 0 || bonus.more !== 1)) {
            console.log(
                `🎯 [${debugLabel}] 基礎: ${baseValue} + ${bonus.flat.toFixed(0)} → ` +
                `×(1-${(bonus.increased * 100).toFixed(0)}%) ×${bonus.more.toFixed(2)} = ${finalValue.toFixed(1)}`
            );
        }

        return finalValue;
    }

    /**
     * 🎯 應用數量加成（通常只有 FLAT 和 INCREASED，沒有 MORE）
     * 
     * 適用於：彈射次數、穿透次數、分裂數量等離散值
     * 
     * @param baseCount 基礎數量
     * @param bonus 加成分類
     * @returns 最終數量（整數）
     */
    public static applyCountBonus(
        baseCount: number,
        bonus: BonusBreakdown
    ): number {
        return Math.floor((baseCount + bonus.flat) * (1 + bonus.increased));
    }

    /**
     * 🎯 獲取元素傷害加成（使用標籤系統，配置驅動）
     * 
     * ✅ 自動從標籤族系推斷元素類型，不再硬編碼
     * 
     * 工作原理：
     * 1. 遍歷每個標籤
     * 2. 使用 TagService 找到標籤的根元素（通過 parent 追溯）
     * 3. 根據根元素構造屬性ID（如 fire → fire_damage）
     * 4. 累加該元素的傷害加成
     * 
     * @param unit 單位
     * @param elementTags 元素標籤陣列（如 ['burn', 'elemental']）
     * @returns 傷害加成百分比（如 0.3 = +30%）
     * 
     * @example
     * // burn 標籤 → 追溯到 fire → 查找 fire_damage 屬性
     * getElementDamageBonus(hero, ['burn']) // 使用 fire_damage 加成
     * 
     * // freeze 標籤 → 追溯到 cold → 查找 ice_damage 屬性
     * getElementDamageBonus(hero, ['freeze']) // 使用 ice_damage 加成
     */
    public static getElementDamageBonus(
        unit: ServerGameUnit,
        elementTags?: string[]
    ): number {
        if (!elementTags || elementTags.length === 0) {
            return 0;
        }

        const TagService = require('@/Game/Services/TagService').TagService;
        const tagService = TagService.getInstance();

        let totalBonus = 0;
        const processedElements = new Set<string>(); // 避免重複計算同一元素

        // 遍歷每個元素標籤
        for (const tag of elementTags) {
            const lowerTag = tag.toLowerCase();

            // 🎯 使用 TagService 獲取標籤的完整路徑（包含父級）
            const tagPath = tagService.getTagPath(lowerTag);

            // 找到根元素（通常是 element category 的標籤）
            let rootElement: string | null = null;

            for (const pathTag of tagPath) {
                const tagDef = tagService.getTagDefinition(pathTag);
                if (tagDef && tagDef.category === 'element') {
                    rootElement = pathTag;
                    break;
                }
            }

            // 如果沒有找到元素標籤，直接用當前標籤嘗試
            if (!rootElement) {
                rootElement = lowerTag;
            }

            // 避免重複計算同一元素
            if (processedElements.has(rootElement)) {
                continue;
            }
            processedElements.add(rootElement);

            // 🎯 構造屬性ID（如 fire → fire_damage）
            const propertyId = `${rootElement}_damage`;

            // 獲取該元素的傷害加成
            const bonus = BonusCalculator.getPropertyBonus(propertyId, unit);
            // 元素傷害加成通常只使用 INCREASED 和 MORE
            totalBonus += bonus.increased + (bonus.more - 1);

            // 調試日誌（可選）
            if (bonus.increased !== 0 || bonus.more !== 1) {
                console.log(
                    `🔥 [Element Damage] ${rootElement}: +${(bonus.increased * 100).toFixed(0)}% ` +
                    `×${bonus.more.toFixed(2)}`
                );
            }
        }

        return totalBonus;
    }
}
