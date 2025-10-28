import { WeaponSchema } from "@/Colyseus/Schema/Weapon/WeaponData";
import { getWeaponConfig } from "../Factories/WeaponConfig";
import { PropertyType } from "@/Types";

/**
 * 最終武器屬性接口
 */
export interface FinalWeaponStats {
    finalDamage: number;
    finalRange: number;
    finalSpeed: number;
    finalCritRate?: number;
    finalCritDamage?: number;
    finalLifeSteal?: number;
    displayName: string;
    rarity?: string;
}

/**
 * 武器數據服務 - 專注於武器數據的業務邏輯計算
 * 不負責實例管理和緩存，只處理純計算邏輯
 */
export class WeaponDataService {

    /**
     * 計算武器的最終屬性
     */
    static calculateFinalStats(weaponData: WeaponSchema): FinalWeaponStats {
        const config = getWeaponConfig(weaponData.weaponId);

        if (!config) {
            throw new Error(`無法找到武器配置: ${weaponData.weaponId}`);
        }

        // 計算各種加成乘數
        const multipliers = this.calculateMultipliers(weaponData);

        // 計算最終屬性
        const finalDamage = Math.floor(config.baseDamage * multipliers.damage);
        const finalRange = Math.floor(config.attackRange + multipliers.range);
        const finalSpeed = Math.max(100, Math.floor(config.attackSpeed * multipliers.speed));

        // 計算戰鬥特效屬性
        const finalCritRate = this.calculateBaseCritRate(weaponData) * multipliers.stats;
        const finalCritDamage = this.calculateBaseCritDamage(weaponData) * multipliers.stats;
        const finalLifeSteal = this.calculateBaseLifeSteal(weaponData) * multipliers.stats;

        // 生成顯示名稱
        const displayName = this.generateDisplayName(weaponData, config);

        return {
            finalDamage,
            finalRange,
            finalSpeed,
            finalCritRate,
            finalCritDamage,
            finalLifeSteal,
            displayName,
            rarity: weaponData.rarity
        };
    }

    /**
     * 計算各種加成乘數
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
        const rangeMultiplier = weaponData.getPropertyValue(PropertyType.ATTACK_RANGE) || 0; // 強化微幅增加射程
        const speedMultiplier = Math.max(0.5, 1 - (weaponData.level - 1) * 0.02); // 等級降低攻擊間隔
        const statsMultiplier = levelMultiplier;

        return {
            damage: damageMultiplier,
            range: Array.isArray(rangeMultiplier) ? 0 : rangeMultiplier,
            speed: speedMultiplier,
            stats: statsMultiplier
        };
    }

    /**
     * 生成武器顯示名稱
     */
    static generateDisplayName(weaponData: WeaponSchema, config?: any): string {
        const weaponConfig = config || getWeaponConfig(weaponData.weaponId);
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
     * 計算基礎暴擊傷害
     */
    private static calculateBaseCritDamage(weaponData: WeaponSchema): number {
        return 150 + weaponData.getPropertyValue(PropertyType.CRITICAL_DAMAGE)[0]?.value || 0; // 基礎150% + 武器屬性 + 天賦
    }

    /**
     * 計算基礎生命偷取
     */
    private static calculateBaseLifeSteal(weaponData: WeaponSchema): number {
        return weaponData.getPropertyValue(PropertyType.LIFE_STEAL)[0]?.value || 0; // 武器屬性 + 天賦
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
}
