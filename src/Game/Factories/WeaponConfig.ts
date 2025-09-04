/**
 * 武器配置定義 - 集中管理所有武器的基本信息
 */

import { GoogleSheetCache } from "../../Tasks/GoogleSheetCache";
import { ITEM_RATE, WeaponType, WeaponConfigDefinition } from "../../Types";
/**
 * 動態武器配置管理器
 */
export class WeaponConfigManager {
    private static instance: WeaponConfigManager;
    private weaponConfigs: Record<string, WeaponConfigDefinition> = {};
    private isInitialized: boolean = false;

    private constructor() { }

    public static getInstance(): WeaponConfigManager {
        if (!WeaponConfigManager.instance) {
            WeaponConfigManager.instance = new WeaponConfigManager();
        }
        return WeaponConfigManager.instance;
    }

    /**
     * 初始化武器配置 - 優先從本地快取載入
     */
    public async initialize(): Promise<void> {
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
    public async reload(): Promise<void> {
        this.isInitialized = false;
        await this.initialize();
    }

    /**
     * 獲取所有武器配置
     */
    public getAllConfigs(): Record<string, WeaponConfigDefinition> {
        if (!this.isInitialized) {
            console.warn('⚠️ 武器配置未初始化，返回預設配置');
            return {};
        }
        return this.weaponConfigs;
    }

    /**
     * 根據ID獲取武器配置
     */
    public getConfig(weaponId: string): WeaponConfigDefinition | null {
        if (!this.isInitialized) {
            console.warn('⚠️ 武器配置未初始化，使用預設配置');
            return null;
        }
        return this.weaponConfigs[weaponId] || null;
    }

    /**
     * 獲取指定類型的所有武器
     */
    public getConfigsByType(type: WeaponType): WeaponConfigDefinition[] {
        const configs = this.getAllConfigs();
        return Object.values(configs).filter(config => config.classModule === type.toString());
    }

    /**
     * 獲取指定稀有度的所有武器
     */
    public getConfigsByRarity(rarity: ITEM_RATE): WeaponConfigDefinition[] {
        const configs = this.getAllConfigs();
        return Object.values(configs).filter(config => config.enabled && this.getConfigRarity(config.id) === rarity);
    }

    /**
     * 根據武器ID獲取稀有度
     */
    private getConfigRarity(weaponId: string): ITEM_RATE {
        // 根據武器ID或其他邏輯確定稀有度
        // 這裡可以根據實際需求調整邏輯
        const config = this.getConfig(weaponId);
        if (!config) return ITEM_RATE.COMMON;

        // 示例：根據屬性數量判斷稀有度
        const fixedCount = config.fixedProperties ? config.fixedProperties.split(',').length : 0;
        const randomCount = config.randomProperties ? config.randomProperties.split(',').length : 0;
        const totalComplexity = fixedCount + randomCount;

        if (totalComplexity >= 8) return ITEM_RATE.LEGENDARY;
        if (totalComplexity >= 6) return ITEM_RATE.EPIC;
        if (totalComplexity >= 4) return ITEM_RATE.RARE;
        if (totalComplexity >= 2) return ITEM_RATE.UNCOMMON;
        return ITEM_RATE.COMMON;
    }
}

// 獲取管理器單例
const weaponConfigManager = WeaponConfigManager.getInstance();

/**
 * 初始化武器配置系統
 */
export async function initializeWeaponConfigs(): Promise<void> {
    await weaponConfigManager.initialize();
}

/**
 * 重新載入武器配置
 */
export async function reloadWeaponConfigs(): Promise<void> {
    await weaponConfigManager.reload();
}

/**
 * 根據武器ID獲取配置
 */
export function getWeaponConfig(weaponId: string): WeaponConfigDefinition | null {
    return weaponConfigManager.getConfig(weaponId);
}

/**
 * 獲取指定類型的所有武器
 */
export function getWeaponsByType(type: WeaponType): WeaponConfigDefinition[] {
    return weaponConfigManager.getConfigsByType(type);
}

/**
 * 獲取指定稀有度的所有武器
 */
export function getWeaponsByRarity(rarity: ITEM_RATE): WeaponConfigDefinition[] {
    return weaponConfigManager.getConfigsByRarity(rarity);
}

/**
 * 驗證武器配置完整性
 */
export function validateWeaponConfig(weaponId: string): boolean {
    const config = weaponConfigManager.getConfig(weaponId);
    if (!config) {
        console.warn(`⚠️ 武器配置不存在: ${weaponId}`);
        return false;
    }

    // 檢查必要欄位
    if (!config.id || !config.name ||
        config.baseDamage === undefined || config.baseDamage === null ||
        config.attackSpeed === undefined || config.attackSpeed === null ||
        config.attackRange === undefined || config.attackRange === null) {
        console.warn(`⚠️ 武器配置缺少必要欄位: ${weaponId}`);
        return false;
    }

    return true;
}

/**
 * 獲取武器配置統計信息
 */
export function getWeaponConfigStats(): {
    totalConfigs: number;
    enabledConfigs: number;
    configsByType: Record<string, number>;
    configsByClass: Record<string, number>;
} {
    const configs = getAllWeaponConfigs();
    const enabled = configs.filter(c => c.enabled);

    const byType: Record<string, number> = {};
    const byClass: Record<string, number> = {};

    for (const config of configs) {
        // 統計類型
        const type = config.classModule || 'unknown';
        byType[type] = (byType[type] || 0) + 1;

        // 統計武器類別
        const weaponClass = config.weaponClass || 'unknown';
        byClass[weaponClass] = (byClass[weaponClass] || 0) + 1;
    }

    return {
        totalConfigs: configs.length,
        enabledConfigs: enabled.length,
        configsByType: byType,
        configsByClass: byClass
    };
}

/**
 * 獲取所有武器配置
 */
export function getAllWeaponConfigs(): WeaponConfigDefinition[] {
    const configs = weaponConfigManager.getAllConfigs();
    return Object.values(configs);
}

/**
 * 向下兼容：導出 WEAPON_CONFIGS
 * @deprecated 建議使用 getWeaponConfig() 等方法
 */
export const WEAPON_CONFIGS = new Proxy({} as Record<string, WeaponConfigDefinition>, {
    get(target, prop: string) {
        if (typeof prop === 'string') {
            return weaponConfigManager.getConfig(prop);
        }
        return undefined;
    },

    ownKeys(target) {
        const configs = weaponConfigManager.getAllConfigs();
        return Object.keys(configs);
    },

    has(target, prop: string) {
        return weaponConfigManager.getConfig(prop) !== null;
    }
});
