
import { min } from "class-validator";
import { PropertyValue, WeaponQuality, WeaponPropertyDefinition, PropertyValueType, compositeFormatCategory } from "../../Types/Equipment/WeaponPropertyTypes";
import { ConfigManager } from "../Managers/ConfigManager";

/**
 * 武器屬性服務 - 新屬性系統的核心
 * 負責屬性解析、生成和應用邏輯
 */
export class WeaponPropertyService {
    private static instance: WeaponPropertyService;
    private weaponProperties: Map<string, WeaponPropertyDefinition> = new Map();
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
            const cachedData = ConfigManager.getWeaponProperties();
            if (cachedData && cachedData) {
                // 建立屬性數據庫映射
                for (const property of cachedData) {
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
    ): { fixed: PropertyValue[], random: PropertyValue[] } {
        if (!this.isInitialized) {
            throw new Error('WeaponPropertyService 未初始化');
        }

        try {
            // 獲取武器配置
            const weaponConfig = ConfigManager.getWeaponConfigById(weaponId);
            if (!weaponConfig) {
                console.warn(`⚠️ 找不到武器配置: ${weaponId}`);
                return { fixed: [], random: [] };
            }

            const properties: PropertyValue[] = [];

            // 1. 解析固定屬性
            const fixedProperties = this.parseFixedProperties(weaponConfig.fixedProperties, quality);
            // properties.push(...fixedProperties);

            // 2. 生成隨機屬性
            const randomProperties = this.generateRandomProperties(
                weaponConfig.randomProperties,
                quality,
                seed
            );
            //properties.push(...randomProperties);

            console.log(`🎲 ${weaponId} (${quality}) 生成了 ${properties.length} 個屬性`);
            return { fixed: fixedProperties, random: randomProperties }

        } catch (error) {
            console.error(`❌ 生成武器屬性失敗 ${weaponId}:`, error);
            return { fixed: [], random: [] }
        }
    }

    /**
     * 解析固定屬性字符串
     * @param fixedPropsString 固定屬性字符串，如 "knockback,stun,sweep_angle"
     * @returns 屬性值列表
     */
    private parseFixedProperties(fixedPropsString: string, quality: WeaponQuality): PropertyValue[] {
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
                const value = this.generatePropertyValue(propertyDef, quality == WeaponQuality.LEGENDARY);
                properties.push(value);
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
        const randomCount = WeaponPropertyService.getRandomPropertyCount(quality);

        if (randomCount === 0) return [];

        // 使用種子生成偽隨機數
        const rng = this.createSeededRNG(seed);
        const selectedProps = this.selectRandomProperties(propPool, randomCount, rng);

        const properties: PropertyValue[] = [];

        for (const propType of selectedProps) {
            const propertyDef = this.weaponProperties.get(propType);
            if (!propertyDef) continue;

            // 隨機屬性使用隨機值
            const value = this.generatePropertyValue(propertyDef, quality == WeaponQuality.LEGENDARY, rng);
            properties.push(value);
        }

        return properties;
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
     * 解析屬性值
     * @param propertyDef 屬性定義
     * @param useMaxValue 是否使用最大值（固定屬性用）
     * @param rng 隨機數生成器
     * @returns 屬性值
     */
    private generatePropertyValue(
        propertyDef: WeaponPropertyDefinition,
        useMaxValue: boolean = false,
        rng?: () => number
    ): PropertyValue {
        const { valueType, valueMin, valueMax, compositeFormat } = propertyDef;
        let res = {
            type: propertyDef.propertyType,
            valueType: valueType,
            value: 0,
            probability: 100,
            duration: 0,
            stacked: propertyDef.stacked,
            category: propertyDef.category,
            description: propertyDef.description
        } as PropertyValue


        res.probability = this.getProbability(valueType, compositeFormat || '', valueMin, valueMax, useMaxValue);
        switch (valueType) {
            case 'single':
                res.value = Number(valueMax);
                break;
            case 'range':
                const min = typeof valueMin === 'number' ? valueMin : parseFloat(valueMin);
                const max = typeof valueMax === 'number' ? valueMax : parseFloat(valueMax);
                const random = rng ? rng() : Math.random();
                res.value = Math.floor(min + random * (max - min + 1));
                break;

            //複合類型
            case 'composite':
                if (compositeFormat)
                    return this.parseCompositeValue(res, compositeFormat, valueMin, valueMax, useMaxValue);
                else {
                    throw new Error(`⚠️ 缺少複合屬性格式: ${propertyDef.propertyType}`);
                }
                break;

            default:
                console.warn(`⚠️ 未知的值類型: ${valueType} for property: ${propertyDef.propertyType}`);
                break;
        }

        return res;
    }

    private getProbability(valueType: PropertyValueType, compositeFormat: string, min: number | string, max: number | string, useMaxValue = false): number {

        if (compositeFormat == '' || !compositeFormat.includes('probability')) {
            return 100;
        }

        switch (valueType) {
            case 'single':
                //如果是單值 直接返回最小值
                return (typeof min === 'number' ? min : parseFloat(min));
            case 'range':


                const maxNum = typeof max === 'number' ? max : parseFloat(max);
                const minNum = typeof min === 'number' ? min : parseFloat(min);
                if (useMaxValue) {
                    return maxNum;
                }
                const random = Math.random();
                return Math.floor(minNum + random * (maxNum - minNum + 1));

            case 'composite':
                const composites = compositeFormat.split('|');
                for (let i = 0; i < composites.length; i++) {
                    //這個是機率
                    if (composites[i].includes('probability')) {
                        const minValues = parseInt(min.toString().split('|')[i]);
                        const maxValues = parseInt(max.toString().split('|')[i]);
                        const random = Math.random();
                        return Math.floor(minValues + random * (maxValues - minValues + 1));
                    }
                }

                return 100;

            default:
                console.warn(`⚠️ 未知的值類型: ${valueType}`);
                return 100;
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
        data: PropertyValue,
        compositeFormat: string,
        minValue: string | number,
        maxValue: string | number,
        useMaxValue: boolean = false,

    ): PropertyValue {
        try {

            // 檢查輸入是否為 null 或 undefined
            if (minValue === null || minValue === undefined || maxValue === null || maxValue === undefined) {

                throw new Error("複合值輸入為空");
            }

            // 將輸入轉換為字符串
            const minStr = String(minValue);
            const maxStr = String(maxValue);

            // 解析複合值
            let minValues = minStr.split('|').map(v => {
                const parsed = parseFloat(v.trim());
                if (isNaN(parsed)) {
                    console.warn(`⚠️ 無法解析最小值: "${v.trim()}"`);
                    return 0;
                }
                return parsed;
            });

            let maxValues = maxStr.split('|').map(v => {
                const parsed = parseFloat(v.trim());
                if (isNaN(parsed)) {
                    console.warn(`⚠️ 無法解析最大值: "${v.trim()}"`);
                    return 0;
                }
                return parsed;
            });

            if (minValues.length !== maxValues.length) {
                throw new Error(`⚠️ 複合值長度不匹配: ${minStr} (${minValues.length}) vs ${maxStr} (${maxValues.length})`);
            }
            const compositeFormatParts = compositeFormat.split('|').map(s => s.trim());
            if (minValues.length != compositeFormatParts.length) {
                throw new Error(`⚠️ 複合值格式長度不匹配: ${compositeFormat} (${compositeFormatParts.length}) vs ${minStr} (${minValues.length})`);
            }

            if (useMaxValue) {
                minValues = maxValues;
            }
            //開始解析
            for (let i = 0; i < compositeFormatParts.length; i++) {
                const format = compositeFormatParts[i] as compositeFormatCategory;
                const minVal = minValues[i];
                const maxVal = maxValues[i];
                const random = Math.random();
                const value = Math.floor(minVal + random * (maxVal - minVal + 1));
                switch (format) {
                    case 'probability':
                        data.probability = value;
                        break;
                    case 'duration':
                        data.duration = value;
                        break;
                    case 'damage':
                        data.value = value;
                        break;
                    case 'count':
                    case 'intensity':
                        data.intensity = value;
                        break;
                }
            }

            return data;
        } catch (error) {
            console.error(`❌ 解析複合值失敗: minValue=${minValue}, maxValue=${maxValue}`, error);
            throw `❌ 解析複合值失敗: minValue=${minValue}, maxValue=${maxValue}`;
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
     * 重新載入屬性數據
     */
    public async reload(): Promise<void> {
        this.isInitialized = false;
        this.weaponProperties.clear();
        await this.initialize();
    }

    /**
 * 根據品質獲取隨機屬性數量
 * 品質機率: [54,30,10,5,1] 對應 [0,1,2,3,4] 個隨機詞綴
 */
    private static getRandomPropertyCount(quality: WeaponQuality): number {
        const qualityMap = {
            [WeaponQuality.NORMAL]: 0,    // 普通: 0個隨機詞綴
            [WeaponQuality.MAGIC]: 1,     // 魔法: 1個隨機詞綴
            [WeaponQuality.RARE]: 2,      // 稀有: 2個隨機詞綴
            [WeaponQuality.EPIC]: 3,      // 史詩: 3個隨機詞綴
            [WeaponQuality.LEGENDARY]: 4  // 傳奇: 4個隨機詞綴
        };
        return qualityMap[quality] || 0;
    }
}