import { GoogleCacheData } from '@/Types';
import { ItemConfigDefinition } from '@/Types/Equipment/ItemTypes';
import { WeaponConfigDefinition, WeaponPropertyDefinition } from '@/Types/Equipment/WeaponPropertyTypes';
import { MaterialConfigDefinition } from '@/Types/Equipment/MaterialTypes';
import { EnemyConfigDefinition } from '@/Types/Game/EnemyTypes';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 配置鍵類型（用於類型安全）
 */
type ConfigKey = keyof GoogleCacheData;

/**
 * 🎯 統一配置管理器（ORM 風格）
 * 
 * @description
 * 使用泛型提供統一的配置查詢 API，類似 ORM 的使用體驗。
 * 
 * @architecture
 * ```
 * ConfigManager
 *   ├── 泛型查詢方法（getAll, getById, filterByField 等）
 *   └── 特殊業務邏輯方法（getEnemiesByWave, getMaterialsByEnemyLevel 等）
 * ```
 * 
 * @example
 * ```typescript
 * // 基礎查詢（使用泛型）
 * const items = ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs');
 * const enemy = ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', 'zombie');
 * const rareItems = ConfigManager.filterByField<ItemConfigDefinition>('ItemConfigs', 'rarity', 'legendary');
 * 
 * // 特殊查詢
 * const wave5Enemies = ConfigManager.getEnemiesByWave(5);
 * const randomEnemyId = ConfigManager.getRandomEnemyIdByWave(10);
 * const levelMaterials = ConfigManager.getMaterialsByEnemyLevel(5);
 * ```
 */
export class ConfigManager {
    private static cache: GoogleCacheData;
    private static cachePath = path.join(process.cwd(), 'data', 'google-sheets-cache.json');

    // ==================== 核心方法 ====================

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
            } catch (error) {
                console.error('❌ 載入 Google Sheets 快取失敗:', error);
                throw new Error("載入 Google Sheets 快取失敗");
            }
        }

        return this.cache;
    }

    /**
     * 重新載入配置快取
     */
    public static reloadCache(): void {
        this.cache = null as any;
        console.log('🔄 重新載入配置快取');
        this.loadCache();
    }

    // ==================== 泛型查詢方法 ====================

    /**
     * 獲取所有配置（泛型方法）
     * @example ConfigManager.getAll<ItemConfigDefinition>('ItemConfigs')
     */
    public static getAll<T>(key: ConfigKey): T[] {
        const cache = this.loadCache();
        return (cache[key] || []) as T[];
    }

    /**
     * 根據 ID 查找單個配置（泛型方法）
     * @example ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', 'zombie')
     */
    public static getById<T extends { id: string | number }>(
        key: ConfigKey,
        id: string | number
    ): T | null {
        const items = this.getAll<T>(key);
        return items.find(item => item.id === id) || null;
    }

    /**
     * 根據欄位值篩選（泛型方法）
     * @example ConfigManager.filterByField<ItemConfigDefinition>('ItemConfigs', 'rarity', 'legendary')
     */
    public static filterByField<T>(
        key: ConfigKey,
        fieldName: keyof T,
        value: any,
        enabledCheck: boolean = true
    ): T[] {
        const items = this.getAll<T>(key);
        return items.filter(item => {
            const matchField = item[fieldName] === value;
            const isEnabled = !enabledCheck || (item as any).enabled !== false;
            return matchField && isEnabled;
        });
    }

    /**
     * 獲取啟用的配置（泛型方法）
     * @example ConfigManager.getEnabled<ItemConfigDefinition>('ItemConfigs')
     */
    public static getEnabled<T>(key: ConfigKey): T[] {
        const items = this.getAll<T>(key);
        return items.filter(item => (item as any).enabled !== false);
    }

    /**
     * 多條件篩選（泛型方法）
     * @example ConfigManager.filterByConditions<ItemConfigDefinition>('ItemConfigs', { rarity: 'legendary', type: 'weapon' })
     */
    public static filterByConditions<T>(
        key: ConfigKey,
        conditions: Partial<T>,
        enabledCheck: boolean = true
    ): T[] {
        const items = this.getAll<T>(key);
        return items.filter(item => {
            const matchesConditions = Object.entries(conditions).every(
                ([k, value]) => item[k as keyof T] === value
            );
            const isEnabled = !enabledCheck || (item as any).enabled !== false;
            return matchesConditions && isEnabled;
        });
    }

    /**
     * 範圍篩選（泛型方法）
     * @example ConfigManager.filterByRange<MaterialConfigDefinition>('MaterialConfigs', 'dropFromEnemyLevel', 1, 10)
     */
    public static filterByRange<T>(
        key: ConfigKey,
        fieldName: keyof T,
        min?: number,
        max?: number,
        enabledCheck: boolean = true
    ): T[] {
        const items = this.getAll<T>(key);
        return items.filter(item => {
            const value = item[fieldName] as any;
            const inRange = (min === undefined || value >= min) &&
                (max === undefined || value <= max);
            const isEnabled = !enabledCheck || (item as any).enabled !== false;
            return inRange && isEnabled;
        });
    }

    // ==================== 敵人特殊查詢 ====================

    /**
     * 根據波次獲取可生成的敵人列表
     */
    public static getEnemiesByWave(waveNumber: number): EnemyConfigDefinition[] {
        const enemies = this.getAll<EnemyConfigDefinition>('EnemyConfigs');
        return enemies.filter(enemy =>
            enemy.enabled &&
            enemy.minWave <= waveNumber &&
            (enemy.maxWave === 0 || enemy.maxWave >= waveNumber)
        );
    }

    /**
     * 根據波次獲取加權隨機敵人ID
     */
    public static getRandomEnemyIdByWave(waveNumber: number): string | null {
        const availableEnemies = this.getEnemiesByWave(waveNumber);

        if (availableEnemies.length === 0) {
            return null;
        }

        const totalWeight = availableEnemies.reduce((sum, enemy) => sum + enemy.spawnWeight, 0);
        let random = Math.random() * totalWeight;

        for (const enemy of availableEnemies) {
            random -= enemy.spawnWeight;
            if (random <= 0) {
                return enemy.id;
            }
        }

        return availableEnemies[0].id;
    }

    /**
     * 根據波次和AI類型篩選敵人
     */
    public static getEnemiesByWaveAndAIType(waveNumber: number, aiType: string): EnemyConfigDefinition[] {
        const enemies = this.getEnemiesByWave(waveNumber);
        return enemies.filter(enemy => enemy.aiType === aiType);
    }

    // ==================== 材料特殊查詢 ====================

    /**
     * 根據敵人等級獲取可掉落的材料列表
     */
    public static getMaterialsByEnemyLevel(enemyLevel: number): MaterialConfigDefinition[] {
        const materials = this.getAll<MaterialConfigDefinition>('MaterialConfigs');
        return materials.filter(material => {
            if (!material.enabled) return false;
            return enemyLevel >= material.dropFromEnemyLevel;
        });
    }

    /**
     * 根據敵人等級和稀有度獲取材料
     */
    public static getMaterialsByEnemyLevelAndRarity(
        enemyLevel: number,
        rarity: string
    ): MaterialConfigDefinition[] {
        return this.getMaterialsByEnemyLevel(enemyLevel)
            .filter(material => material.rarity === rarity);
    }

    // ==================== 武器特殊查詢 ====================

    /**
     * 獲取所有武器配置
     */
    public static getWeaponConfigs(): WeaponConfigDefinition[] {
        return this.getAll<WeaponConfigDefinition>('WeaponConfigs');
    }

    /**
     * 獲取所有武器屬性
     */
    public static getWeaponProperties(): WeaponPropertyDefinition[] {
        return this.getAll<WeaponPropertyDefinition>('WeaponProperties');
    }

    /**
     * 根據屬性類型獲取武器屬性
     */
    public static getWeaponPropertyByType(propertyType: string): WeaponPropertyDefinition | null {
        const properties = this.getWeaponProperties();
        return properties.find(prop => prop.propertyType === propertyType) || null;
    }
}
