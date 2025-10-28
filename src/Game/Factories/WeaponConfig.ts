/**
 * 武器配置定義 - 集中管理所有武器的基本信息
 */

import { WeaponConfigDefinition } from "@/Types/Equipment/WeaponPropertyTypes";
import { GoogleSheetCache } from "../../Tasks/GoogleSheetCache";
import { WeaponType } from "@/Types/Equipment/WeaponTypes";
import { EquipmentQuality } from "@/Types";

/**
 * 動態武器配置管理器
 */
export class WeaponConfigManager {

    private static weaponConfigs: Record<string, WeaponConfigDefinition> = {};
    private static isInitialized: boolean = false;

    private constructor() { }

    /**
     * 初始化武器配置 - 優先從本地快取載入
     */
    public static async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // 嘗試從本地快取載入
            const cachedData = GoogleSheetCache.getInstance().getData();

            if (cachedData) {
                this.weaponConfigs = {
                    ...cachedData.WeaponConfigs.reduce((map, obj) => {
                        map[obj.id] = obj;
                        return map;
                    }, {} as Record<string, WeaponConfigDefinition>)
                };
                console.log(`🎮 載入武器配置: ${Object.keys(cachedData.WeaponConfigs).length} 個來自快取`);
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('❌ 初始化武器配置失敗，使用預設配置:', error);

            this.isInitialized = true;
        }
    }

    /**
     * 重新載入武器配置
     */
    public static async reload(): Promise<void> {
        this.isInitialized = false;
        await this.initialize();
    }

    /**
     * 獲取所有武器配置
     */
    public static getAllConfigs(): Record<string, WeaponConfigDefinition> {
        if (!this.isInitialized) {
            console.warn('⚠️ 武器配置未初始化，返回預設配置');
            return {};
        }
        return this.weaponConfigs;
    }

    /**
     * 根據ID獲取武器配置
     */
    public static getConfig(weaponId: string): WeaponConfigDefinition | null {
        if (!this.isInitialized) {
            console.warn('⚠️ 武器配置未初始化，使用預設配置');
            return null;
        }
        return this.weaponConfigs[weaponId] || null;
    }

    /**
     * 獲取指定類型的所有武器
     */
    public static getConfigsByType(type: WeaponType): WeaponConfigDefinition[] {
        const configs = this.getAllConfigs();
        return Object.values(configs).filter(config => config.classModule === type.toString());
    }

    /**
     * 獲取指定稀有度的所有武器
     */
    public static getConfigsByRarity(rarity: EquipmentQuality): WeaponConfigDefinition[] {
        const configs = this.getAllConfigs();
        return Object.values(configs).filter(config => config.enabled && this.getConfigRarity(config.id) === rarity);
    }

    /**
     * 根據武器ID獲取稀有度
     */
    private static getConfigRarity(weaponId: string): EquipmentQuality {
        // 根據武器ID或其他邏輯確定稀有度
        // 這裡可以根據實際需求調整邏輯
        const config = this.getConfig(weaponId);
        if (!config) return EquipmentQuality.NORMAL;

        // 示例：根據屬性數量判斷稀有度
        const fixedCount = config.fixedProperties ? config.fixedProperties.split(',').length : 0;
        const randomCount = config.randomProperties ? config.randomProperties.split(',').length : 0;
        const totalComplexity = fixedCount + randomCount;

        if (totalComplexity >= 8) return EquipmentQuality.LEGENDARY;
        if (totalComplexity >= 6) return EquipmentQuality.EPIC;
        if (totalComplexity >= 4) return EquipmentQuality.RARE;
        if (totalComplexity >= 2) return EquipmentQuality.NORMAL;
        return EquipmentQuality.NORMAL;
    }
}