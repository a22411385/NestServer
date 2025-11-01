
import { PropertyValue, WeaponQuality, StatusEffectDefinition, WeaponConfigDefinition, ModifierType, CategoryKey, WeaponModifier, AttributeBonus } from "../../Types/Equipment/WeaponPropertyTypes";
import { ConfigManager } from "../Managers/ConfigManager";

/**
 * 武器屬性服務 - 新屬性系統的核心
 * 負責屬性解析、生成和應用邏輯
 */
export class WeaponPropertyService {
    private static instance: WeaponPropertyService;

    // 🆕 三個 Map 分別儲存
    private statusEffects: Map<string, StatusEffectDefinition> = new Map();
    private weaponModifiers: Map<string, WeaponModifier> = new Map();
    private attributeBonuses: Map<string, AttributeBonus> = new Map();

    private isInitialized: boolean = false;

    private constructor() { }

    public static getInstance(): WeaponPropertyService {
        if (!WeaponPropertyService.instance) {
            WeaponPropertyService.instance = new WeaponPropertyService();
        }
        return WeaponPropertyService.instance;
    }

    /**
     * 🆕 初始化屬性系統 - 載入三個表
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🔧 初始化武器屬性系統...');

            // 1. 載入狀態效果定義
            const statusEffectList = ConfigManager.getAll<StatusEffectDefinition>('StatusEffectDefinitions');
            if (!statusEffectList || statusEffectList.length === 0) {
                throw new Error('狀態效果數據為空或未載入');
            }
            for (const effect of statusEffectList) {
                this.statusEffects.set(effect.id, effect);
            }

            // 2. 🆕 載入武器詞綴定義
            const modifierList = ConfigManager.getAll<WeaponModifier>('WeaponModifiers');
            for (const modifier of modifierList) {
                this.weaponModifiers.set(modifier.id, modifier);
            }

            // 3. 🆕 載入屬性加成定義
            const bonusList = ConfigManager.getAll<AttributeBonus>('AttributeBonus');
            for (const bonus of bonusList) {
                this.attributeBonuses.set(bonus.id, bonus);
            }

            this.isInitialized = true;
            console.log(`✅ 武器屬性系統初始化完成`);
            console.log(`   - 狀態效果: ${statusEffectList.length} 個`);
            console.log(`   - 武器詞綴: ${modifierList.length} 個`);
            console.log(`   - 屬性加成: ${bonusList.length} 個`);

        } catch (error) {
            console.error('❌ 武器屬性系統初始化失敗:', error);
            console.error('   請確保 GoogleSheetCache.init() 已在此之前調用');
            throw error;
        }
    }

    /**
     * 🆕 生成武器的完整屬性（三種資料）
     * @param weaponId 武器ID
     * @param quality 武器品質
     * @returns 三種屬性資料
     */
    public generateWeaponProperties(
        weaponId: string,
        quality: WeaponQuality
    ): {
        statusEffects: PropertyValue[],
        modifiers: WeaponModifier[],
        bonuses: AttributeBonus[]
    } {
        if (!this.isInitialized) {
            throw new Error('WeaponPropertyService 未初始化');
        }

        try {
            // 獲取武器配置
            const weaponConfig = ConfigManager.getById<WeaponConfigDefinition>('WeaponConfigs', weaponId);
            if (!weaponConfig) {
                console.warn(`⚠️ 找不到武器配置: ${weaponId}`);
                return { statusEffects: [], modifiers: [], bonuses: [] };
            }

            // 1. 解析狀態效果（effectProperties）
            const statusEffects = this.parseEffectProperties(weaponConfig.effectProperties || '', quality);

            // 2. 🆕 解析武器詞綴
            const modifiers = this.parseModifiers(weaponConfig.modifiers || '');

            // 3. 🆕 解析屬性加成
            const bonuses = this.parseBonuses(weaponConfig.bonuses || '');

            console.log(`🎲 ${weaponId} (${quality}) 生成了:`);
            console.log(`   - 狀態效果: ${statusEffects.length} 個`);
            console.log(`   - 武器詞綴: ${modifiers.length} 個`);
            console.log(`   - 屬性加成: ${bonuses.length} 個`);

            return { statusEffects, modifiers, bonuses };

        } catch (error) {
            console.error(`❌ 生成武器屬性失敗 ${weaponId}:`, error);
            return { statusEffects: [], modifiers: [], bonuses: [] };
        }
    }

    /**
     * 🆕 解析狀態效果屬性字串（重命名自 parseFixedProperties）
     * @param effectPropsString 效果屬性字串 "burn,stun,freeze"
     * @param quality 武器品質
     */
    private parseEffectProperties(effectPropsString: string, quality: WeaponQuality): PropertyValue[] {
        if (!effectPropsString) return [];

        const propTypes = effectPropsString.split(',').map(s => s.trim());
        const properties: PropertyValue[] = [];

        for (const propType of propTypes) {
            const propertyDef = this.statusEffects.get(propType);
            if (!propertyDef) {
                console.warn(`⚠️ 未知的狀態效果: ${propType}`);
                continue;
            }

            try {
                const value = this.generatePropertyValue(propertyDef, true);
                properties.push(value);
            } catch (error) {
                console.error(`❌ 生成狀態效果失敗: ${propType}`, error);
                console.error(`屬性定義:`, propertyDef);
            }
        }

        return properties;
    }

    /**
     * 🆕 解析武器詞綴字串
     * @param modifiersString "piercing,chain_attack,critical_chance"
     */
    private parseModifiers(modifiersString: string): WeaponModifier[] {
        if (!modifiersString) return [];

        const modIds = modifiersString.split(',').map(s => s.trim());
        const modifiers: WeaponModifier[] = [];

        for (const modId of modIds) {
            const modifierDef = this.weaponModifiers.get(modId);
            if (!modifierDef) {
                console.warn(`⚠️ 未知的武器詞綴: ${modId}`);
                continue;
            }

            if (!modifierDef.enabled) {
                console.log(`⏸️ 武器詞綴已停用: ${modId}`);
                continue;
            }

            modifiers.push(modifierDef);
        }

        return modifiers;
    }

    /**
     * 🆕 解析屬性加成字串
     * @param bonusesString "strength,attack_speed,intelligence"
     */
    private parseBonuses(bonusesString: string): AttributeBonus[] {
        if (!bonusesString) return [];

        const bonusIds = bonusesString.split(',').map(s => s.trim());
        const bonuses: AttributeBonus[] = [];

        for (const bonusId of bonusIds) {
            const bonusDef = this.attributeBonuses.get(bonusId);
            if (!bonusDef) {
                console.warn(`⚠️ 未知的屬性加成: ${bonusId}`);
                continue;
            }

            if (!bonusDef.enabled) {
                console.log(`⏸️ 屬性加成已停用: ${bonusId}`);
                continue;
            }

            bonuses.push(bonusDef);
        }

        return bonuses;
    }
    /**
     * 🆕 生成屬性值（POE 風格）
     * @param propertyDef 狀態效果定義
     * @param useMaxValue 是否使用最大值（固定屬性用，暫時保留但不使用）
     * @param rng 隨機數生成器（未來可用於隨機屬性池）
     * @returns 屬性值
     */
    private generatePropertyValue(
        propertyDef: StatusEffectDefinition,
        useMaxValue: boolean = false,
        rng?: () => number
    ): PropertyValue {
        // 🆕 POE 風格：直接從定義創建屬性值
        // 不再有 valueType, valueMin, valueMax 的概念
        // 所有數值都是固定的，變化由修改器系統處理

        const tags = propertyDef.tags ? propertyDef.tags.split(',').map(t => t.trim()) : [];

        return {
            id: propertyDef.id,
            displayName: propertyDef.displayName,
            tags: tags,
            modifierType: propertyDef.defaultModifierType,

            // 🆕 使用固定的基礎數值
            value: 0, // 主要數值，具體用途取決於屬性類型
            probability: propertyDef.baseProbability,
            duration: propertyDef.duration,
            baseDamage: propertyDef.baseDamage,
            damageScaling: propertyDef.damageScaling,

            category: propertyDef.category,
            stackable: propertyDef.stackable
        };
    }

    /**
     * 🗑️ 已廢棄的方法區域
     * 
     * POE 風格系統不再使用以下方法：
     * - getProbability() - 直接使用 baseProbability
     * - parseCompositeValue() - 不再有複合值概念
     * - valueType/valueMin/valueMax - 所有數值都是固定的基礎值
     * 
     * 保留此註釋以便未來參考
     */
}