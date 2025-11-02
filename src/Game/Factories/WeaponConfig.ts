/**
 * 武器配置定義 - 集中管理所有武器的基本信息
 */

import { WeaponConfigDefinition } from "@/Types/Equipment/WeaponPropertyTypes";
import { GoogleSheetCache } from "../../Tasks/GoogleSheetCache";

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
            // 🎯 確保 GoogleSheetCache 已初始化
            const cache = GoogleSheetCache.getInstance();

            // 嘗試從本地快取載入
            const cachedData = cache.getData();

            if (!cachedData) {
                throw new Error('GoogleSheetCache 未初始化或資料為空');
            }

            if (!cachedData.WeaponConfigs || cachedData.WeaponConfigs.length === 0) {
                throw new Error('武器配置資料為空');
            }

            this.weaponConfigs = {
                ...cachedData.WeaponConfigs.reduce((map, obj) => {
                    map[obj.id] = obj;
                    return map;
                }, {} as Record<string, WeaponConfigDefinition>)
            };

            console.log(`🎮 載入武器配置: ${Object.keys(this.weaponConfigs).length} 個來自快取`);
            this.isInitialized = true;

        } catch (error) {
            console.error('❌ 初始化武器配置失敗:', error);
            console.error('   請確保 GoogleSheetCache.init() 已在 WeaponConfigManager.initialize() 之前調用');
            throw error; // 🎯 拋出錯誤，不要靜默失敗
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

}