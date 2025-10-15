import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { getWeaponConfig } from "../Factories/WeaponConfig";

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
    static calculateFinalStats(weaponData: WeaponData): FinalWeaponStats {
        const config = getWeaponConfig(weaponData.weaponId);

        if (!config) {
            console.warn(`⚠️ 找不到武器配置: ${weaponData.weaponId}`);
            return {
                finalDamage: 10,
                finalRange: 100,
                finalSpeed: 1000,
                displayName: weaponData.weaponId,
                rarity: 'common'
            };
        }

        // 計算各種加成乘數
        const multipliers = this.calculateMultipliers(weaponData);

        // 計算最終屬性
        const finalDamage = Math.floor(config.baseDamage * multipliers.damage);
        const finalRange = Math.floor(config.attackRange * multipliers.range);
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
            rarity: this.determineWeaponRarity(config)
        };
    }

    /**
     * 計算各種加成乘數
     */
    private static calculateMultipliers(weaponData: WeaponData): {
        damage: number;
        range: number;
        speed: number;
        stats: number;
    } {
        // 等級加成（每級+10%）
        const levelMultiplier = 1 + (weaponData.level - 1) * 0.1;

        // 強化加成（每級+5%）
        const enhanceMultiplier = 1 + weaponData.enhanceLevel * 0.05;

        // 耐久度影響（低於50%時開始有懲罰）
        let durabilityMultiplier = 1;
        if (weaponData.durability < 50) {
            const durabilityPenalty = (50 - weaponData.durability) / 50; // 0-1
            durabilityMultiplier = 1 - durabilityPenalty * 0.3; // 最多-30%
        }

        const damageMultiplier = levelMultiplier * enhanceMultiplier * durabilityMultiplier;
        const rangeMultiplier = levelMultiplier + (weaponData.enhanceLevel * 0.02); // 強化微幅增加射程
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
    static generateDisplayName(weaponData: WeaponData, config?: any): string {
        const weaponConfig = config || getWeaponConfig(weaponData.weaponId);
        let baseName = weaponConfig?.name || weaponData.weaponId
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        // 添加強化等級
        if (weaponData.enhanceLevel > 0) {
            baseName += ` +${weaponData.enhanceLevel}`;
        }

        // 添加武器等級
        if (weaponData.level > 1) {
            baseName += ` (Lv.${weaponData.level})`;
        }

        return baseName;
    }

    /**
     * 增加經驗值
     */
    static addExp(weaponData: WeaponData, amount: number): boolean {
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
     * 強化武器
     */
    static enhance(weaponData: WeaponData): boolean {
        if (weaponData.enhanceLevel >= 15) return false; // 最高強化+15

        weaponData.enhanceLevel += 1;
        weaponData.durability = Math.min(100, weaponData.durability + 5);
        return true;
    }

    /**
     * 修復武器耐久度
     */
    static repair(weaponData: WeaponData, amount: number = 100): void {
        weaponData.durability = Math.min(100, weaponData.durability + amount);
    }

    /**
     * 檢查武器是否可用
     */
    static isUsable(weaponData: WeaponData): boolean {
        return weaponData.durability > 0;
    }

    /**
     * 檢查武器是否可以升級
     */
    static canLevelUp(weaponData: WeaponData): boolean {
        if (weaponData.level >= 100) return false; // 最高等級

        const requiredExp = this.getRequiredExp(weaponData.level);
        return weaponData.exp >= requiredExp;
    }

    /**
     * 計算基礎暴擊率
     */
    private static calculateBaseCritRate(weaponData: WeaponData): number {
        return weaponData.level * 0.5; // 每級增加0.5%暴擊率
    }

    /**
     * 計算基礎暴擊傷害
     */
    private static calculateBaseCritDamage(weaponData: WeaponData): number {
        return 150 + weaponData.enhanceLevel * 10; // 基礎150%，強化每級+10%
    }

    /**
     * 計算基礎生命偷取
     */
    private static calculateBaseLifeSteal(weaponData: WeaponData): number {
        return weaponData.enhanceLevel * 0.2; // 強化每級增加0.2%生命偷取
    }

    /**
     * 根據配置確定武器稀有度
     */
    private static determineWeaponRarity(config: any): string {
        const fixedCount = config.fixedProperties ? config.fixedProperties.split(',').length : 0;
        const randomCount = config.randomProperties ? config.randomProperties.split(',').length : 0;
        const totalComplexity = fixedCount + randomCount;

        if (totalComplexity >= 8) return 'legendary';
        if (totalComplexity >= 6) return 'epic';
        if (totalComplexity >= 4) return 'rare';
        if (totalComplexity >= 2) return 'uncommon';
        return 'common';
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
    static generateStatsKey(weaponData: WeaponData): string {
        // 如果有 uniqueId，直接使用（最可靠的唯一標識）
        if (weaponData.uniqueId) {
            return `weapon_${weaponData.uniqueId}`;
        }

        // 構建完整的屬性字符串
        const keyComponents = [
            weaponData.weaponId,
            weaponData.level,
            weaponData.enhanceLevel,
            weaponData.exp,
            weaponData.durability,
            weaponData.quality || weaponData.rarity || 'normal',
            // 包含固定屬性
            this.serializeProperties(weaponData.fixedProperties),
            // 包含隨機屬性
            this.serializeProperties(weaponData.randomProperties)
        ];

        // 生成完整字符串
        const fullString = keyComponents.join('|');

        // 使用哈希縮短 key 長度，同時保持唯一性
        const hash = this.generateSimpleHash(fullString);

        // 返回包含基本信息和哈希的 key
        return `${weaponData.weaponId}_lv${weaponData.level}_enh${weaponData.enhanceLevel}_${hash}`;
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
     * 檢查兩個武器數據是否在屬性計算上相等
     * 用於緩存優化
     * 
     * 🔧 改進版：檢查所有影響屬性計算的因素
     */
    static areStatsEqual(weapon1: WeaponData, weapon2: WeaponData): boolean {
        // 快速檢查：如果都有 uniqueId，直接比較
        if (weapon1.uniqueId && weapon2.uniqueId) {
            return weapon1.uniqueId === weapon2.uniqueId;
        }

        // 詳細檢查所有相關屬性
        return weapon1.weaponId === weapon2.weaponId &&
            weapon1.level === weapon2.level &&
            weapon1.enhanceLevel === weapon2.enhanceLevel &&
            weapon1.exp === weapon2.exp &&
            weapon1.durability === weapon2.durability &&
            (weapon1.quality || weapon1.rarity) === (weapon2.quality || weapon2.rarity) &&
            this.arePropertiesEqual(weapon1.fixedProperties, weapon2.fixedProperties) &&
            this.arePropertiesEqual(weapon1.randomProperties, weapon2.randomProperties);
    }

    /**
     * 🔧 比較兩個屬性數組是否相等
     */
    private static arePropertiesEqual(props1: any, props2: any): boolean {
        if (!props1 && !props2) return true;
        if (!props1 || !props2) return false;

        try {
            const array1 = props1.toArray ? props1.toArray() : [];
            const array2 = props2.toArray ? props2.toArray() : [];

            if (array1.length !== array2.length) return false;

            // 排序後比較，確保順序不影響結果
            const sorted1 = array1.slice().sort((a: any, b: any) =>
                `${a.type}:${a.value}:${a.subType}`.localeCompare(`${b.type}:${b.value}:${b.subType}`)
            );
            const sorted2 = array2.slice().sort((a: any, b: any) =>
                `${a.type}:${a.value}:${a.subType}`.localeCompare(`${b.type}:${b.value}:${b.subType}`)
            );

            return sorted1.every((prop1: any, index: number) => {
                const prop2 = sorted2[index];
                return prop1.type === prop2.type &&
                    prop1.value === prop2.value &&
                    prop1.subType === prop2.subType;
            });
        } catch (error) {
            console.warn('屬性比較失敗:', error);
            return false;
        }
    }
}
