import { GoogleCacheData } from '@/Types';
import { ItemConfigDefinition } from '@/Types/Equipment/ItemTypes';
import { WeaponConfigDefinition, WeaponPropertyDefinition } from '@/Types/Equipment/WeaponPropertyTypes';
import { MaterialConfigDefinition } from '@/Types/Equipment/MaterialTypes';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 統一配置管理器
 * 負責載入和管理所有來自 Google Sheets 的配置資料
 */
export class ConfigManager {
    private static cache: GoogleCacheData;
    private static cachePath = path.join(process.cwd(), 'data', 'google-sheets-cache.json');

    /**
     * 載入 Google Sheets 快取資料
     */
    private static loadCache(): GoogleCacheData {
        if (!this.cache) {
            try {
                if (!fs.existsSync(this.cachePath)) {
                    console.warn(`⚠️ 配置檔案不存在: ${this.cachePath}`);
                    throw new Error("配置檔案不存在");
                }

                const cacheData = fs.readFileSync(this.cachePath, 'utf8');
                this.cache = JSON.parse(cacheData);

                console.log('✅ Google Sheets 快取載入成功');
                console.log(`📦 載入配置: WeaponConfigs(${this.cache.WeaponConfigs?.length || 0}), WeaponProperties(${this.cache.WeaponProperties?.length || 0}), ItemConfigs(${this.cache.ItemConfigs?.length || 0})`);
            } catch (error) {
                console.error('❌ 載入 Google Sheets 快取失敗:', error);
                throw new Error("載入 Google Sheets 快取失敗");
            }
        }

        return this.cache;
    }

    /**
     * 獲取物品配置
     */
    public static getItemConfigs(): ItemConfigDefinition[] {
        const cache = this.loadCache();
        return cache.ItemConfigs || [];
    }

    /**
     * 獲取武器配置
     */
    public static getWeaponConfigs(): WeaponConfigDefinition[] {
        const cache = this.loadCache();
        return cache.WeaponConfigs || [];
    }

    /**
     * 獲取武器屬性配置
     */
    public static getWeaponProperties(): WeaponPropertyDefinition[] {
        const cache = this.loadCache();
        return cache.WeaponProperties || [];
    }

    /**
     * 🆕 獲取素材配置
     */
    public static getMaterialConfigs(): MaterialConfigDefinition[] {
        const cache = this.loadCache();
        return cache.MaterialConfigs || [];
    }

    /**
     * 🆕 根據ID獲取素材配置
     */
    public static getMaterialConfigById(materialId: string): MaterialConfigDefinition | null {
        const materials = this.getMaterialConfigs();
        return materials.find(material => material.id === materialId) || null;
    }

    /**
     * 🆕 根據稀有度獲取素材列表
     */
    public static getMaterialsByRarity(rarity: string): MaterialConfigDefinition[] {
        const materials = this.getMaterialConfigs();
        return materials.filter(material => material.rarity === rarity && material.enabled);
    }

    /**
     * 🆕 根據類別獲取素材列表
     */
    public static getMaterialsByCategory(category: string): MaterialConfigDefinition[] {
        const materials = this.getMaterialConfigs();
        return materials.filter(material => material.category === category && material.enabled);
    }

    /**
     * 🆕 根據敵人等級獲取可掉落的素材列表
     */
    public static getMaterialsByEnemyLevel(enemyLevel: number): MaterialConfigDefinition[] {
        const materials = this.getMaterialConfigs();
        return materials.filter(material =>
            material.enabled &&
            material.dropFromEnemyLevel <= enemyLevel
        );
    }

    /**
     * 🆕 獲取啟用的素材列表
     */
    public static getEnabledMaterials(): MaterialConfigDefinition[] {
        const materials = this.getMaterialConfigs();
        return materials.filter(material => material.enabled);
    }

    /**
     * 根據ID獲取物品配置
     */
    public static getItemConfigById(itemId: string): ItemConfigDefinition | null {
        const items = this.getItemConfigs();
        return items.find(item => item.id === itemId) || null;
    }

    /**
     * 根據ID獲取武器配置
     */
    public static getWeaponConfigById(weaponId: string): WeaponConfigDefinition | null {
        const weapons = this.getWeaponConfigs();
        return weapons.find(weapon => weapon.id === weaponId) || null;
    }

    /**
     * 根據稀有度獲取物品列表
     */
    public static getItemsByRarity(rarity: string): ItemConfigDefinition[] {
        const items = this.getItemConfigs();
        return items.filter(item => item.rarity === rarity && item.enabled);
    }

    /**
     * 根據類型獲取物品列表
     */
    public static getItemsByType(type: string): ItemConfigDefinition[] {
        const items = this.getItemConfigs();
        return items.filter(item => item.type === type && item.enabled);
    }

    /**
     * 根據分類獲取物品列表
     */
    public static getItemsByCategory(category: string): ItemConfigDefinition[] {
        const items = this.getItemConfigs();
        return items.filter(item => item.category === category && item.enabled);
    }

    /**
     * 🆕 根據NPC ID獲取可販賣的物品列表
     */
    public static getItemsByNpcId(npcId: string): ItemConfigDefinition[] {
        const items = this.getItemConfigs();
        return items.filter(item => item.enabled && item.npcId === npcId);
    }

    /**
     * 🆕 驗證物品是否可以被指定NPC販賣
     */
    public static canNpcSellItem(npcId: string, itemId: string): boolean {
        const item = this.getItemConfigById(itemId);
        return item ? item.enabled && item.npcId === npcId : false;
    }

    /**
     * 獲取啟用的物品列表
     */
    public static getEnabledItems(): ItemConfigDefinition[] {
        const items = this.getItemConfigs();
        return items.filter(item => item.enabled);
    }

    /**
     * 獲取啟用的武器列表
     */
    public static getEnabledWeapons(): WeaponConfigDefinition[] {
        const weapons = this.getWeaponConfigs();
        return weapons.filter(weapon => weapon.enabled);
    }

    /**
     * 重新載入快取
     */
    public static reloadCache(): void {
        this.cache = {} as GoogleCacheData;
        console.log('🔄 重新載入配置快取');
        this.loadCache();
    }
}
