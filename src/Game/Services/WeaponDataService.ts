import { WeaponSchema } from "@/Colyseus/Schema/Weapon/WeaponSchema";
import { WeaponConfigManager } from "../Factories/WeaponConfig";
import { GoogleSheetCache } from "@/Tasks/GoogleSheetCache";
import { WeaponModifier } from "@/Types/Equipment/WeaponPropertyTypes";
import { WeaponStatConfig } from "@/Types";

/**
 * 武器數據服務 - 專注於武器數據的業務邏輯計算
 * 不負責實例管理和緩存，只處理純計算邏輯
 */
export class WeaponDataService {
    // 🆕 靜態緩存：WeaponStatConfigs 數據
    private static weaponStatConfigs: WeaponStatConfig[] | null = null;
    private static validStatNames: Set<string> | null = null;

    /**
     * 🆕 初始化 WeaponStatConfigs（懶加載）
     */
    private static initWeaponStatConfigs(): void {
        if (this.weaponStatConfigs !== null) return;

        const cache = GoogleSheetCache.getInstance();
        const data = cache.getData();

        if (!data || !data.WeaponStatConfigs) {
            console.error('❌ WeaponStatConfigs 表未找到！');
            this.weaponStatConfigs = [];
            this.validStatNames = new Set();
            return;
        }

        this.weaponStatConfigs = data.WeaponStatConfigs;
        this.validStatNames = new Set(
            this.weaponStatConfigs.map(config => config.statName)
        );

        console.log(`✅ 已載入 ${this.weaponStatConfigs.length} 個武器屬性配置`);
    }

    /**
     * 🆕 驗證屬性名是否存在於 WeaponStatConfigs 表中
     */
    static validateStatName(statName: string): boolean {
        this.initWeaponStatConfigs();
        return this.validStatNames!.has(statName);
    }

    /**
     * 🆕 獲取所有合法的屬性名列表
     */
    static getValidStatNames(): string[] {
        this.initWeaponStatConfigs();
        return Array.from(this.validStatNames!);
    }

    /**
     * 🆕 獲取屬性配置信息
     */
    static getStatConfig(statName: string): WeaponStatConfig | null {
        this.initWeaponStatConfigs();
        return this.weaponStatConfigs!.find(config => config.statName === statName) || null;
    }

    /**
     * 計算武器的最終屬性
     * 🆕 包含武器詞綴和屬性加成的計算
     */
    static calculateFinalStats(weaponData: WeaponSchema): any {
        const config = WeaponConfigManager.getConfig(weaponData.weaponId);

        if (!config) {
            throw new Error(`無法找到武器配置: ${weaponData.weaponId}`);
        }

        // 計算各種加成乘數
        const multipliers = this.calculateMultipliers(weaponData);

        // 計算基礎屬性（✅ 使用配置表標準名稱）
        const weaponDamage = Math.floor(config.baseDamage * multipliers.damage);
        const attackRange = Math.floor(config.attackRange + multipliers.range);
        const attackSpeed = Math.max(100, Math.floor(config.attackSpeed * multipliers.speed));

        // 計算戰鬥特效屬性（✅ 使用配置表標準名稱）
        const critRate = this.calculateBaseCritRate(weaponData) * multipliers.stats;
        const critDamage = this.calculateBaseCritDamage(weaponData) * multipliers.stats;
        const lifeSteal = this.calculateBaseLifeSteal(weaponData) * multipliers.stats;

        // 生成顯示名稱
        const displayName = this.generateDisplayName(weaponData, config);

        // 🆕 建立基礎屬性對象（使用配置表標準命名）
        const finalStats = {
            weaponDamage,      // ✅ 配置表標準名稱
            attackRange,       // ✅ 配置表標準名稱
            attackSpeed,       // ✅ 配置表標準名稱
            critRate,          // ✅ 配置表標準名稱
            critDamage,        // ✅ 配置表標準名稱
            lifeSteal,         // ✅ 配置表標準名稱
            displayName,
            rarity: weaponData.rarity
        };

        // 🆕 應用武器詞綴（動態讀取配置）
        this.applyWeaponModifiers(weaponData, finalStats);

        return finalStats;
    }

    /**
     * 🆕 計算各種加成乘數（POE風格）
     */
    private static calculateMultipliers(weaponData: WeaponSchema): {
        damage: number;
        range: number;
        speed: number;
        stats: number;
    } {
        // 等級加成（每級+10%）
        const levelMultiplier = 1 + (weaponData.level - 1) * 0.1

        const damageMultiplier = levelMultiplier;
        // 🆕 使用屬性ID而非enum
        const rangeProperty = weaponData.getProperty('attack_range');
        const rangeMultiplier = rangeProperty ? rangeProperty.value : 0;
        const speedMultiplier = Math.max(0.5, 1 - (weaponData.level - 1) * 0.02); // 等級降低攻擊間隔
        const statsMultiplier = levelMultiplier;

        return {
            damage: damageMultiplier,
            range: rangeMultiplier,
            speed: speedMultiplier,
            stats: statsMultiplier
        };
    }

    /**
     * 生成武器顯示名稱
     */
    static generateDisplayName(weaponData: WeaponSchema, config?: any): string {
        const weaponConfig = config || WeaponConfigManager.getConfig(weaponData.weaponId);
        let baseName = weaponConfig?.name || weaponData.weaponId
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        // 添加武器等級
        if (weaponData.level > 1) {
            baseName += ` (Lv.${weaponData.level})`;
        }

        return baseName;
    }

    /**
     * 增加經驗值
     */
    static addExp(weaponData: WeaponSchema, amount: number): boolean {
        weaponData.exp += amount;
        const requiredExp = this.getRequiredExp(weaponData.level);

        if (weaponData.exp >= requiredExp && weaponData.level < 100) {
            weaponData.exp -= requiredExp;
            weaponData.level += 1;
            return true; // 升級了
        }

        return false; // 沒升級
    }

    /**
     * 檢查武器是否可以升級
     */
    static canLevelUp(weaponData: WeaponSchema): boolean {
        if (weaponData.level >= 100) return false; // 最高等級

        const requiredExp = this.getRequiredExp(weaponData.level);
        return weaponData.exp >= requiredExp;
    }

    /**
     * 計算基礎暴擊率
     */
    private static calculateBaseCritRate(weaponData: WeaponSchema): number {
        return weaponData.level * 0.5; // 每級增加0.5%暴擊率
    }

    /**
     * 🆕 計算基礎暴擊傷害（使用屬性ID）
     */
    private static calculateBaseCritDamage(weaponData: WeaponSchema): number {
        const critDamageProp = weaponData.getProperty('critical_damage');
        const critDamageValue = critDamageProp ? critDamageProp.value : 0;
        return 150 + critDamageValue; // 基礎150% + 武器屬性
    }

    /**
     * 🆕 計算基礎生命偷取（使用屬性ID）
     */
    private static calculateBaseLifeSteal(weaponData: WeaponSchema): number {
        const lifeStealProp = weaponData.getProperty('life_steal');
        return lifeStealProp ? lifeStealProp.value : 0; // 武器屬性
    }

    /**
     * 獲取升級所需經驗值
     */
    private static getRequiredExp(level: number): number {
        return Math.floor(level * level * 1.5 + level * 10);
    }

    /**
     * 生成武器的唯一緩存鍵
     * 用於實例管理器的緩存系統
     * 
     * 🔧 改進版：包含所有影響屬性計算的因素，使用哈希避免 key 過長
     */
    static generateStatsKey(weaponData: WeaponSchema): string {
        // 如果有 uniqueId，直接使用（最可靠的唯一標識）
        if (weaponData.uniqueId) {
            return `weapon_${weaponData.uniqueId}`;
        }

        // 構建完整的屬性字符串
        const keyComponents = [
            weaponData.weaponId,
            weaponData.level,
            weaponData.exp,
            weaponData.rarity,
            // 包含固定屬性
            this.serializeProperties(weaponData.fixedProperties),
        ];

        // 生成完整字符串
        const fullString = keyComponents.join('|');

        // 使用哈希縮短 key 長度，同時保持唯一性
        const hash = this.generateSimpleHash(fullString);

        // 返回包含基本信息和哈希的 key
        return `${weaponData.weaponId}_lv${weaponData.level}_${hash}`;
    }

    /**
     * 🔧 序列化屬性數組為字符串
     */
    private static serializeProperties(properties: any): string {
        if (!properties || !properties.toArray) {
            return '';
        }

        try {
            const props = properties.toArray();
            return props.map((prop: any) =>
                `${prop.type || ''}:${prop.value || 0}:${prop.subType || ''}`
            ).sort().join(','); // 排序確保相同屬性產生相同字符串
        } catch (error) {
            return '';
        }
    }

    /**
     * 🔧 生成簡單哈希（避免使用複雜的加密算法）
     */
    private static generateSimpleHash(str: string): string {
        let hash = 0;
        if (str.length === 0) return '0';

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 轉換為32位整數
        }

        // 轉換為正數並轉為36進制縮短長度
        return Math.abs(hash).toString(36);
    }

    /**
     * 🆕 應用武器詞綴到最終屬性
     * 配置驅動，支援動態擴展
     * 
     * POE 規則計算順序：
     * 1. FLAT（固定值）- 直接相加
     * 2. INCREASED（提升）- 百分比相加後統一計算
     * 3. MORE（額外）- 百分比相乘
     */
    private static applyWeaponModifiers(weaponData: WeaponSchema, finalStats: any): void {
        try {
            // 獲取武器的所有詞綴
            const modifiers = weaponData.getModifiers();
            if (!modifiers || modifiers.length === 0) {
                return;
            }

            // 按 affectedStat 分組詞綴
            const modifiersByAffectedStat = new Map<string, any[]>();

            for (const modifier of modifiers) {
                if (!modifier.enabled) continue; // 跳過未啟用的詞綴

                const affectedStat = modifier.affectedStat;
                if (!affectedStat) continue;

                if (!modifiersByAffectedStat.has(affectedStat)) {
                    modifiersByAffectedStat.set(affectedStat, []);
                }
                modifiersByAffectedStat.get(affectedStat)!.push(modifier);
            }

            // 對每個受影響的屬性進行計算
            for (const [affectedStat, mods] of modifiersByAffectedStat) {
                this.applyModifiersToStat(affectedStat, mods, finalStats);
            }

        } catch (error) {
            console.error('[WeaponDataService] 應用武器詞綴失敗:', error);
        }
    }

    /**
     * 🆕 對單個屬性應用詞綴計算（POE 規則）
     */
    private static applyModifiersToStat(
        affectedStat: string,
        modifiers: WeaponModifier[],
        finalStats: any
    ): void {
        // 🆕 驗證 affectedStat 是否合法
        if (!this.validateAffectedStat(affectedStat, modifiers[0]?.id || 'unknown')) {
            console.warn(`⚠️  跳過無效的詞綴屬性: ${affectedStat}`);
            return;  // 跳過無效屬性
        }

        // 將 snake_case 轉為 camelCase 作為屬性名
        const statKey = this.convertToCamelCase(affectedStat);

        // 獲取基礎值（如果存在）
        const baseValue = (finalStats as any)[statKey] || 0;

        // 分類詞綴
        let flatSum = 0;           // FLAT 總和
        let increasedSum = 0;      // INCREASED 總和
        let moreProduct = 1;       // MORE 乘積

        for (const modifier of modifiers) {
            const value = modifier.baseValue || 0;
            const modifierType = (modifier.modifierType || 'flat').toLowerCase();
            // const count = modifier. || 1; // 疊加次數

            switch (modifierType) {
                case 'flat':
                    flatSum += value;
                    break;
                case 'increased':
                    // INCREASED 類型以百分比相加
                    increasedSum += value;
                    break;
                case 'more':
                    // MORE 類型以百分比相乘
                    moreProduct *= (1 + (value / 100));
                    break;
            }
        }

        // POE 規則計算：基礎值 → FLAT → INCREASED → MORE
        let finalValue = baseValue;

        // 步驟 1：加上 FLAT
        finalValue += flatSum;

        // 步驟 2：應用 INCREASED（百分比加成）
        if (increasedSum !== 0) {
            finalValue *= (1 + increasedSum / 100);
        }

        // 步驟 3：應用 MORE（乘法加成）
        if (moreProduct !== 1) {
            finalValue *= moreProduct;
        }

        // 特殊處理：傷害屬性需要取整
        if (affectedStat.includes('damage')) {
            finalValue = Math.floor(finalValue);
        }

        // 設定最終值
        (finalStats as any)[statKey] = finalValue;
    }

    /**
     * 🆕 將 snake_case 轉換為 camelCase
     * 例如：pierce_count → pierceCount
     */
    private static convertToCamelCase(str: string): string {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * 🆕 驗證 affectedStat 是否合法（配置驅動）
     * 從 WeaponStatConfigs 表讀取合法屬性名
     */
    private static validateAffectedStat(affectedStat: string, modifierId: string): boolean {
        // 將 snake_case 轉為 camelCase 進行驗證
        const camelCaseStatName = this.convertToCamelCase(affectedStat);

        // 檢查是否存在於 WeaponStatConfigs 表中
        if (!this.validateStatName(camelCaseStatName)) {
            const validStats = this.getValidStatNames();
            console.error(
                `\n❌ [WeaponModifier 配置錯誤]\n` +
                `   詞綴: "${modifierId}"\n` +
                `   錯誤的 affectedStat: "${affectedStat}" (camelCase: "${camelCaseStatName}")\n` +
                `   可用的屬性名 (共 ${validStats.length} 個):\n` +
                `   ${validStats.map(s => `    - ${s}`).join('\n')}\n` +
                `\n💡 請在 Google Sheets 的 WeaponStatConfigs 表中添加新屬性！`
            );
            return false;
        }
        return true;
    }
}
