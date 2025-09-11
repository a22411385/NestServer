import { PropertyValue } from "@/Types/Equipment/WeaponPropertyTypes";
import { TalentManager } from "../Managers/TalentManager";
import { WeaponPropertyService } from "./WeaponPropertyService";
import { CharacterORM } from "@/ORM/charater.entity";

/**
 * 屬性計算服務 - 整合天賦系統與武器屬性計算
 * 負責計算角色的最終屬性值（基礎屬性 + 武器屬性 + 天賦效果）
 */
export class PropertyCalculationService {
    private static instance: PropertyCalculationService;
    private isInitialized: boolean = false;

    private constructor() { }

    public static getInstance(): PropertyCalculationService {
        if (!PropertyCalculationService.instance) {
            PropertyCalculationService.instance = new PropertyCalculationService();
        }
        return PropertyCalculationService.instance;
    }

    /**
     * 初始化屬性計算服務
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🧮 初始化屬性計算服務...');

            // 確保相關服務已初始化
            await TalentManager.getInstance().initialize();
            await WeaponPropertyService.getInstance().initialize();

            this.isInitialized = true;
            console.log('✅ 屬性計算服務初始化完成');
        } catch (error) {
            console.error('❌ 屬性計算服務初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 計算角色的最終屬性
     * @param character 角色實體
     * @param weaponProperties 武器屬性列表（可選）
     * @returns 最終屬性列表
     */
    public calculateFinalProperties(
        character: CharacterORM,
        weaponProperties: PropertyValue[] = []
    ): PropertyValue[] {
        if (!this.isInitialized) {
            throw new Error('PropertyCalculationService 未初始化');
        }

        console.log(`🧮 計算角色 ${character.id} 的最終屬性`);

        // 1. 獲取基礎屬性（基於角色等級和基礎數值）
        const baseProperties = this.calculateBaseProperties(character);

        // 2. 合併武器屬性
        const combinedProperties = this.combineProperties(baseProperties, weaponProperties);

        // 3. 應用天賦效果
        const talentManager = TalentManager.getInstance();
        const finalProperties = talentManager.applyTalentEffectsToProperties(
            character.id.toString(),
            combinedProperties
        );

        console.log(`✅ 完成屬性計算 - 共 ${finalProperties.length} 個屬性`);
        return finalProperties;
    }

    /**
     * 計算角色基礎屬性（基於等級）
     */
    private calculateBaseProperties(character: CharacterORM): PropertyValue[] {
        const level = character.Lv;

        // 基礎屬性隨等級成長
        const baseProperties: PropertyValue[] = [
            {
                type: 'strength' as any,
                value: 10 + level * 2,
                description: '基礎力量'
            },
            {
                type: 'intelligence' as any,
                value: 10 + level * 2,
                description: '基礎智力'
            },
            {
                type: 'vitality' as any,
                value: 15 + level * 3,
                description: '基礎體力'
            },
            {
                type: 'agility' as any,
                value: 10 + level * 2,
                description: '基礎敏捷'
            },
            {
                type: 'attack_damage' as any,
                value: 5 + level,
                description: '基礎攻擊力'
            },
            {
                type: 'attack_speed' as any,
                value: 1.0,
                description: '基礎攻擊速度'
            },
            {
                type: 'critical_chance' as any,
                value: 5,
                description: '基礎暴擊率'
            },
            {
                type: 'physical_resistance' as any,
                value: level,
                description: '基礎物理抗性'
            },
            {
                type: 'magical_resistance' as any,
                value: level,
                description: '基礎魔法抗性'
            }
        ];

        console.log(`  📊 生成基礎屬性 (等級 ${level})`);
        return baseProperties;
    }

    /**
     * 合併多個屬性列表
     */
    private combineProperties(
        baseProperties: PropertyValue[],
        additionalProperties: PropertyValue[]
    ): PropertyValue[] {
        const combined = [...baseProperties];
        const propertyMap = new Map<string, number>();

        // 建立索引
        combined.forEach((prop, index) => {
            propertyMap.set(prop.type.toString(), index);
        });

        // 合併額外屬性
        for (const additionalProp of additionalProperties) {
            const propertyKey = additionalProp.type.toString();
            const existingIndex = propertyMap.get(propertyKey);

            if (existingIndex !== undefined) {
                // 累加到現有屬性
                const existing = combined[existingIndex];
                if (typeof existing.value === 'number' && typeof additionalProp.value === 'number') {
                    existing.value += additionalProp.value;
                }
            } else {
                // 添加新屬性
                combined.push({ ...additionalProp });
                propertyMap.set(propertyKey, combined.length - 1);
            }
        }

        return combined;
    }

    /**
     * 獲取角色屬性摘要（用於顯示和戰鬥計算）
     */
    public getPropertySummary(
        character: CharacterORM,
        weaponProperties: PropertyValue[] = []
    ): any {
        const finalProperties = this.calculateFinalProperties(character, weaponProperties);

        // 建立屬性查找映射
        const propertyMap = new Map<string, PropertyValue>();
        finalProperties.forEach(prop => {
            propertyMap.set(prop.type.toString(), prop);
        });

        // 提取關鍵屬性
        const getValue = (propertyType: string): number => {
            const prop = propertyMap.get(propertyType);
            if (!prop) return 0;
            return Array.isArray(prop.value) ? prop.value[0] : prop.value;
        };

        return {
            characterId: character.id,
            level: character.Lv,

            // 主屬性
            strength: getValue('strength'),
            intelligence: getValue('intelligence'),
            vitality: getValue('vitality'),
            agility: getValue('agility'),

            // 戰鬥屬性
            attackDamage: getValue('attack_damage'),
            attackSpeed: getValue('attack_speed'),
            attackRange: getValue('attack_range'),
            criticalChance: getValue('critical_chance'),
            criticalDamage: getValue('critical_damage'),
            lifeSteal: getValue('life_steal'),

            // 防禦屬性
            physicalResistance: getValue('physical_resistance'),
            magicalResistance: getValue('magical_resistance'),

            // 計算衍生屬性
            totalHealth: this.calculateDerivedHealth(getValue('vitality')),
            totalMana: this.calculateDerivedMana(getValue('intelligence')),

            // 完整屬性列表
            allProperties: finalProperties
        };
    }

    /**
     * 計算衍生的生命值
     */
    private calculateDerivedHealth(vitality: number): number {
        return 100 + vitality * 10; // 基礎100 + 體力*10
    }

    /**
     * 計算衍生的法力值
     */
    private calculateDerivedMana(intelligence: number): number {
        return 50 + intelligence * 5; // 基礎50 + 智力*5
    }

    /**
     * 更新角色等級後重新計算天賦點數
     */
    public updateCharacterLevel(character: CharacterORM): void {
        const talentManager = TalentManager.getInstance();
        talentManager.updateCharacterLevel(character.id.toString(), character.Lv);

        // 更新角色的天賦資料
        const talentData = talentManager.getCharacterTalents(character.id.toString());
        character.setTalentData(talentData);

        console.log(`🌟 更新角色 ${character.id} 等級到 ${character.Lv}`);
    }

    /**
     * 獲取角色的天賦統計
     */
    public getTalentStats(character: CharacterORM): any {
        const talentManager = TalentManager.getInstance();
        return talentManager.getTalentStats(character.id.toString());
    }

    /**
     * 分配天賦點數
     */
    public allocateTalentPoint(character: CharacterORM, talentId: string): boolean {
        const talentManager = TalentManager.getInstance();
        const success = talentManager.allocateTalentPoint(character.id.toString(), talentId);

        if (success) {
            // 更新角色資料
            const talentData = talentManager.getCharacterTalents(character.id.toString());
            character.setTalentData(talentData);
        }

        return success;
    }

    /**
     * 重置角色天賦
     */
    public resetTalents(character: CharacterORM): void {
        const talentManager = TalentManager.getInstance();
        talentManager.resetTalents(character.id.toString());

        // 更新角色資料
        const talentData = talentManager.getCharacterTalents(character.id.toString());
        character.setTalentData(talentData);

        console.log(`🔄 重置角色 ${character.id} 的天賦`);
    }
}

/**
 * 便利函數 - 初始化屬性計算服務
 */
export async function initializePropertyCalculationService(): Promise<void> {
    await PropertyCalculationService.getInstance().initialize();
}
