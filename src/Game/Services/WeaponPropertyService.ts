
import { PropertyType, PropertyValue, PropertyTypeValue, WeaponQuality } from "../../Types/Equipment/WeaponPropertyTypes";
import { GoogleSheetCache } from "../../Tasks/GoogleSheetCache";

/**
 * 武器屬性服務 - 新屬性系統的核心
 * 負責屬性解析、生成和應用邏輯
 */
export class WeaponPropertyService {
    private static instance: WeaponPropertyService;
    private weaponProperties: Map<string, any> = new Map();
    private isInitialized: boolean = false;

    private constructor() { }

    public static getInstance(): WeaponPropertyService {
        if (!WeaponPropertyService.instance) {
            WeaponPropertyService.instance = new WeaponPropertyService();
        }
        return WeaponPropertyService.instance;
    }

    /**
     * 初始化屬性系統 - 載入屬性數據庫
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🔧 初始化武器屬性系統...');

            // 從本地快取載入屬性數據
            const cachedData = GoogleSheetCache.getInstance().getData();

            if (cachedData && cachedData.WeaponProperties) {
                // 建立屬性數據庫映射
                for (const property of cachedData.WeaponProperties) {
                    this.weaponProperties.set(property.propertyType, property);
                }

                console.log(`✅ 成功載入 ${this.weaponProperties.size} 個武器屬性`);
                this.isInitialized = true;
            } else {
                throw new Error('無法載入武器屬性數據');
            }

        } catch (error) {
            console.error('❌ 武器屬性系統初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 生成武器的完整屬性列表
     * @param weaponId 武器ID
     * @param quality 武器品質
     * @param seed 隨機種子
     * @returns 屬性列表
     */
    public generateWeaponProperties(
        weaponId: string,
        quality: WeaponQuality,
        seed: number
    ): PropertyValue[] {
        if (!this.isInitialized) {
            throw new Error('WeaponPropertyService 未初始化');
        }

        try {
            // 獲取武器配置
            const weaponConfig = this.getWeaponConfig(weaponId);
            if (!weaponConfig) {
                console.warn(`⚠️ 找不到武器配置: ${weaponId}`);
                return [];
            }

            const properties: PropertyValue[] = [];

            // 1. 解析固定屬性
            const fixedProperties = this.parseFixedProperties(weaponConfig.fixedProperties);
            properties.push(...fixedProperties);

            // 2. 生成隨機屬性
            const randomProperties = this.generateRandomProperties(
                weaponConfig.randomProperties,
                quality,
                seed
            );
            properties.push(...randomProperties);

            console.log(`🎲 ${weaponId} (${quality}) 生成了 ${properties.length} 個屬性`);
            return properties;

        } catch (error) {
            console.error(`❌ 生成武器屬性失敗: ${weaponId}`, error);
            return [];
        }
    }

    /**
     * 解析固定屬性字符串
     * @param fixedPropsString 固定屬性字符串，如 "knockback,stun,sweep_angle"
     * @returns 屬性值列表
     */
    private parseFixedProperties(fixedPropsString: string): PropertyValue[] {
        if (!fixedPropsString) return [];

        const propTypes = fixedPropsString.split(',').map(s => s.trim());
        const properties: PropertyValue[] = [];

        for (const propType of propTypes) {
            const propertyDef = this.weaponProperties.get(propType);
            if (!propertyDef) {
                console.warn(`⚠️ 未知的屬性類型: ${propType}`);
                continue;
            }

            try {
                // 固定屬性使用最大值
                const value = this.generatePropertyValue(propertyDef, true);
                properties.push({
                    type: propType as PropertyTypeValue,
                    value: value,
                    isPercentage: this.isPercentageProperty(propType),
                    description: propertyDef.displayName,
                    isDynamic: false
                });
            } catch (error) {
                console.error(`❌ 生成固定屬性失敗: ${propType}`, error);
                console.error(`屬性定義:`, propertyDef);
            }
        }

        return properties;
    }

    /**
     * 生成隨機屬性
     * @param randomPropsString 隨機屬性池字符串
     * @param quality 武器品質
     * @param seed 隨機種子
     * @returns 隨機屬性列表
     */
    private generateRandomProperties(
        randomPropsString: string,
        quality: WeaponQuality,
        seed: number
    ): PropertyValue[] {
        if (!randomPropsString) return [];

        const propPool = randomPropsString.split(',').map(s => s.trim());
        const randomCount = this.getRandomPropertyCount(quality);

        if (randomCount === 0) return [];

        // 使用種子生成偽隨機數
        const rng = this.createSeededRNG(seed);
        const selectedProps = this.selectRandomProperties(propPool, randomCount, rng);

        const properties: PropertyValue[] = [];

        for (const propType of selectedProps) {
            const propertyDef = this.weaponProperties.get(propType);
            if (!propertyDef) continue;

            // 隨機屬性使用隨機值
            const value = this.generatePropertyValue(propertyDef, false, rng);
            properties.push({
                type: propType as PropertyTypeValue,
                value: value,
                isPercentage: this.isPercentageProperty(propType),
                description: propertyDef.displayName,
                isDynamic: true
            });
        }

        return properties;
    }

    /**
     * 根據品質獲取隨機屬性數量
     * 品質機率: [54,30,10,5,1] 對應 [0,1,2,3,4] 個隨機詞綴
     */
    private getRandomPropertyCount(quality: WeaponQuality): number {
        const qualityMap = {
            [WeaponQuality.NORMAL]: 0,    // 普通: 0個隨機詞綴
            [WeaponQuality.MAGIC]: 1,     // 魔法: 1個隨機詞綴
            [WeaponQuality.RARE]: 2,      // 稀有: 2個隨機詞綴
            [WeaponQuality.EPIC]: 3,      // 史詩: 3個隨機詞綴
            [WeaponQuality.LEGENDARY]: 4  // 傳奇: 4個隨機詞綴
        };

        return qualityMap[quality] || 0;
    }

    /**
     * 隨機選擇屬性
     * @param propPool 屬性池
     * @param count 選擇數量
     * @param rng 隨機數生成器
     * @returns 選中的屬性類型列表
     */
    private selectRandomProperties(propPool: string[], count: number, rng: () => number): string[] {
        const shuffled = [...propPool];

        // Fisher-Yates 洗牌算法
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    /**
     * 生成屬性值
     * @param propertyDef 屬性定義
     * @param useMaxValue 是否使用最大值（固定屬性用）
     * @param rng 隨機數生成器
     * @returns 屬性值
     */
    private generatePropertyValue(
        propertyDef: any,
        useMaxValue: boolean = false,
        rng?: () => number
    ): number | number[] {
        const { valueType, valueMin, valueMax } = propertyDef;

        switch (valueType) {
            case 'single':
                return typeof valueMin === 'number' ? valueMin : parseFloat(valueMin);

            case 'range':
                if (useMaxValue) {
                    return typeof valueMax === 'number' ? valueMax : parseFloat(valueMax);
                }

                const min = typeof valueMin === 'number' ? valueMin : parseFloat(valueMin);
                const max = typeof valueMax === 'number' ? valueMax : parseFloat(valueMax);
                const random = rng ? rng() : Math.random();
                return Math.floor(min + random * (max - min + 1));

            case 'composite':
                return this.parseCompositeValue(valueMin, valueMax, useMaxValue, rng);

            default:
                console.warn(`⚠️ 未知的值類型: ${valueType} for property: ${propertyDef.propertyType}`);
                return 0;
        }
    }

    /**
     * 解析複合值 (使用 | 分隔符)
     * @param minValue 最小值字符串或數字
     * @param maxValue 最大值字符串或數字
     * @param useMaxValue 是否使用最大值
     * @param rng 隨機數生成器
     * @returns 複合值數組
     */
    private parseCompositeValue(
        minValue: string | number,
        maxValue: string | number,
        useMaxValue: boolean = false,
        rng?: () => number
    ): number[] {
        try {
            // 檢查輸入是否為 null 或 undefined
            if (minValue === null || minValue === undefined || maxValue === null || maxValue === undefined) {
                console.warn(`⚠️ 複合值輸入為空: minValue=${minValue}, maxValue=${maxValue}`);
                return [0];
            }

            // 將輸入轉換為字符串
            const minStr = String(minValue);
            const maxStr = String(maxValue);

            console.log(`🔧 解析複合值: minStr="${minStr}", maxStr="${maxStr}"`);

            // 檢查是否包含分隔符
            if (!minStr.includes('|') && !maxStr.includes('|')) {
                // 不是複合值，返回單個值
                const min = parseFloat(minStr);
                const max = parseFloat(maxStr);

                if (isNaN(min) || isNaN(max)) {
                    console.warn(`⚠️ 無法解析數值: minStr="${minStr}", maxStr="${maxStr}"`);
                    return [0];
                }

                if (useMaxValue) {
                    return [max];
                }

                const random = rng ? rng() : Math.random();
                return [Math.floor(min + random * (max - min + 1))];
            }

            // 解析複合值
            const minValues = minStr.split('|').map(v => {
                const parsed = parseFloat(v.trim());
                if (isNaN(parsed)) {
                    console.warn(`⚠️ 無法解析最小值: "${v.trim()}"`);
                    return 0;
                }
                return parsed;
            });

            const maxValues = maxStr.split('|').map(v => {
                const parsed = parseFloat(v.trim());
                if (isNaN(parsed)) {
                    console.warn(`⚠️ 無法解析最大值: "${v.trim()}"`);
                    return 0;
                }
                return parsed;
            });

            if (minValues.length !== maxValues.length) {
                console.warn(`⚠️ 複合值長度不匹配: ${minStr} (${minValues.length}) vs ${maxStr} (${maxValues.length})`);
                return minValues;
            }

            if (useMaxValue) {
                return maxValues;
            }

            const result: number[] = [];
            const random = rng || Math.random;

            for (let i = 0; i < minValues.length; i++) {
                const min = minValues[i];
                const max = maxValues[i];
                result.push(Math.floor(min + random() * (max - min + 1)));
            }

            console.log(`✅ 複合值解析結果: [${result.join(', ')}]`);
            return result;

        } catch (error) {
            console.error(`❌ 解析複合值失敗: minValue=${minValue}, maxValue=${maxValue}`, error);
            return [0];
        }
    }

    /**
     * 創建基於種子的偽隨機數生成器
     * @param seed 種子值
     * @returns 隨機數生成器函數
     */
    private createSeededRNG(seed: number): () => number {
        let currentSeed = seed;

        return () => {
            // Linear Congruential Generator
            currentSeed = (currentSeed * 1664525 + 1013904223) % Math.pow(2, 32);
            return currentSeed / Math.pow(2, 32);
        };
    }

    /**
     * 判斷屬性是否為百分比類型
     */
    private isPercentageProperty(propType: string): boolean {
        const percentageProps = [
            'critical_chance', 'critical_damage', 'life_steal',
            'attack_speed', 'slow'
        ];
        return percentageProps.includes(propType);
    }

    /**
     * 獲取武器配置
     * @param weaponId 武器ID
     * @returns 武器配置
     */
    private getWeaponConfig(weaponId: string): any {
        const cachedData = GoogleSheetCache.getInstance().getData();
        if (!cachedData || !cachedData.WeaponConfigs) return null;

        return cachedData.WeaponConfigs.find(config => config.id === weaponId);
    }

    /**
     * 根據機率生成武器品質
     * 機率: [54,30,10,5,1] 對應 普通->傳奇
     */
    public static generateRandomQuality(): WeaponQuality {
        const random = Math.random() * 100;

        if (random < 54) return WeaponQuality.NORMAL;     // 54%
        if (random < 84) return WeaponQuality.MAGIC;      // 30% 
        if (random < 94) return WeaponQuality.RARE;       // 10%
        if (random < 99) return WeaponQuality.EPIC;       // 5%
        return WeaponQuality.LEGENDARY;                   // 1%
    }

    /**
     * 獲取屬性定義
     * @param propertyType 屬性類型
     * @returns 屬性定義
     */
    public getPropertyDefinition(propertyType: string): any {
        return this.weaponProperties.get(propertyType);
    }

    /**
     * 驗證屬性配置
     * @param weaponId 武器ID
     * @returns 驗證結果
     */
    public validateWeaponConfig(weaponId: string): boolean {
        const config = this.getWeaponConfig(weaponId);
        if (!config) return false;

        // 檢查固定屬性是否存在
        if (config.fixedProperties) {
            const fixedProps = config.fixedProperties.split(',');
            for (const prop of fixedProps) {
                if (!this.weaponProperties.has(prop.trim())) {
                    console.warn(`⚠️ ${weaponId} 的固定屬性 ${prop} 不存在`);
                    return false;
                }
            }
        }

        // 檢查隨機屬性池是否存在
        if (config.randomProperties) {
            const randomProps = config.randomProperties.split(',');
            for (const prop of randomProps) {
                if (!this.weaponProperties.has(prop.trim())) {
                    console.warn(`⚠️ ${weaponId} 的隨機屬性 ${prop} 不存在`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 重新載入屬性數據
     */
    public async reload(): Promise<void> {
        this.isInitialized = false;
        this.weaponProperties.clear();
        await this.initialize();
    }

    /**
     * 獲取系統統計
     */
    public getStats(): {
        propertiesCount: number;
        isInitialized: boolean;
        basicProperties: number;
        combatProperties: number;
        statusProperties: number;
        attributeProperties: number;
    } {
        const properties = Array.from(this.weaponProperties.values());

        return {
            propertiesCount: this.weaponProperties.size,
            isInitialized: this.isInitialized,
            basicProperties: properties.filter(p => p.category === 'basic').length,
            combatProperties: properties.filter(p => p.category === 'combat').length,
            statusProperties: properties.filter(p => p.category === 'status').length,
            attributeProperties: properties.filter(p => p.category === 'attribute').length,
        };
    }
}

// 導出便利方法
const weaponPropertyService = WeaponPropertyService.getInstance();

/**
 * 初始化武器屬性系統
 */
export async function initializeWeaponPropertySystem(): Promise<void> {
    await weaponPropertyService.initialize();
}

/**
 * 生成武器屬性
 */
export function generateWeaponProperties(
    weaponId: string,
    quality: WeaponQuality,
    seed: number
): PropertyValue[] {
    return weaponPropertyService.generateWeaponProperties(weaponId, quality, seed);
}

/**
 * 生成隨機武器品質
 */
export const generateRandomWeaponQuality = WeaponPropertyService.generateRandomQuality;
