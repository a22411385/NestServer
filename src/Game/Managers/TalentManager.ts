import { CharacterTalentData, TalentConfig, TalentEffect, TalentPropertyType, ModifierType, AppliedTalentEffect } from "../../Types/Game/TalentTypes";
import { TalentService } from "../Services/TalentService";
import { PropertyValue, PropertyTypeValue } from "../../Types/Equipment/WeaponPropertyTypes";

/**
 * 天賦管理器 - 管理角色天賦實例和效果應用
 * 負責天賦點數分配、效果計算和屬性修改
 */
export class TalentManager {
    private static instance: TalentManager;
    private characterTalents: Map<string, CharacterTalentData> = new Map();
    private isInitialized: boolean = false;

    private constructor() { }

    public static getInstance(): TalentManager {
        if (!TalentManager.instance) {
            TalentManager.instance = new TalentManager();
        }
        return TalentManager.instance;
    }

    /**
     * 初始化天賦管理器
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🌟 初始化天賦管理器...');

            // 確保 TalentService 已初始化
            await TalentService.getInstance().initialize();

            this.isInitialized = true;
            console.log('✅ 天賦管理器初始化完成');
        } catch (error) {
            console.error('❌ 天賦管理器初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 獲取角色天賦資料
     */
    public getCharacterTalents(characterId: string): CharacterTalentData {
        if (!this.characterTalents.has(characterId)) {
            // 創建預設天賦資料
            this.characterTalents.set(characterId, {
                characterId,
                totalPoints: 0,
                usedPoints: 0,
                availablePoints: 0,
                allocatedTalents: {}
            });
        }
        return this.characterTalents.get(characterId)!;
    }

    /**
     * 設定角色天賦資料（從資料庫載入時使用）
     */
    public setCharacterTalents(characterId: string, talentData: CharacterTalentData): void {
        this.characterTalents.set(characterId, talentData);
    }

    /**
     * 計算角色可用的天賦點數（基於等級）
     */
    public calculateTotalTalentPoints(level: number): number {
        // 根據文檔：每級獲得1點天賦點
        return Math.max(0, level - 1); // 1級不給天賦點，2級開始每級1點
    }

    /**
     * 分配天賦點數
     */
    public allocateTalentPoint(characterId: string, talentId: string): boolean {
        const talentData = this.getCharacterTalents(characterId);
        const talentService = TalentService.getInstance();

        // 獲取天賦配置
        const talentConfig = talentService.getTalentConfig(talentId);
        if (!talentConfig) {
            console.warn(`找不到天賦配置: ${talentId}`);
            return false;
        }

        // 檢查是否還有天賦點數可用
        if (talentData.usedPoints >= talentData.totalPoints) {
            console.warn(`天賦點數不足: ${characterId}`);
            return false;
        }

        // 檢查當前天賦等級
        const currentTalentLevel = talentData.allocatedTalents[talentId] || 0;
        if (currentTalentLevel >= talentConfig.max_points) {
            console.warn(`天賦已達最大等級: ${talentId}`);
            return false;
        }

        // 檢查前置需求
        if (!this.validatePrerequisites(characterId, talentConfig)) {
            console.warn(`不符合前置需求: ${talentId}`);
            return false;
        }

        // 分配天賦點
        talentData.allocatedTalents[talentId] = currentTalentLevel + 1;
        talentData.usedPoints += 1;
        talentData.availablePoints = talentData.totalPoints - talentData.usedPoints;

        console.log(`✅ 成功分配天賦點: ${talentId} -> 等級 ${currentTalentLevel + 1}`);
        return true;
    }

    /**
     * 重置角色天賦點數
     */
    public resetTalents(characterId: string): void {
        const talentData = this.getCharacterTalents(characterId);
        talentData.allocatedTalents = {};
        talentData.usedPoints = 0;
        talentData.availablePoints = talentData.totalPoints;
        talentData.lastResetTime = new Date();

        console.log(`✅ 重置角色天賦: ${characterId}`);
    }

    /**
     * 驗證天賦前置需求
     */
    private validatePrerequisites(characterId: string, talentConfig: TalentConfig): boolean {
        if (!talentConfig.prerequisites || talentConfig.prerequisites.trim() === '') {
            return true;
        }

        const talentData = this.getCharacterTalents(characterId);
        const talentService = TalentService.getInstance();

        // 解析逗號分隔的前置天賦ID
        const prerequisiteIds = talentConfig.prerequisites.split(',').map(id => id.trim()).filter(id => id.length > 0);

        for (const prerequisiteId of prerequisiteIds) {
            const prerequisiteTalent = talentService.getTalentConfig(prerequisiteId);
            if (!prerequisiteTalent) {
                console.warn(`找不到前置天賦: ${prerequisiteId}`);
                return false;
            }

            const allocatedLevel = talentData.allocatedTalents[prerequisiteId] || 0;
            if (allocatedLevel < prerequisiteTalent.max_points) {
                console.warn(`前置天賦未點滿: ${prerequisiteId} (${allocatedLevel}/${prerequisiteTalent.max_points})`);
                return false;
            }
        }

        return true;
    }

    /**
     * 計算角色的所有天賦效果
     */
    public calculateTalentEffects(characterId: string): AppliedTalentEffect[] {
        const talentData = this.getCharacterTalents(characterId);
        const talentService = TalentService.getInstance();
        const appliedEffects: AppliedTalentEffect[] = [];

        for (const [talentId, allocatedPoints] of Object.entries(talentData.allocatedTalents)) {
            if (allocatedPoints === 0) continue;

            const effects = talentService.getTalentEffects(talentId);
            if (!effects || effects.length === 0) continue;

            for (const effect of effects) {
                const calculatedValue = this.calculateEffectValue(effect, allocatedPoints);

                appliedEffects.push({
                    talentId,
                    propertyName: effect.property_name,
                    modifierType: effect.modifier_type,
                    value: calculatedValue,
                    condition: effect.condition,
                    isActive: true // 默認激活，後續可加入條件判斷
                });
            }
        }

        return appliedEffects;
    }

    /**
     * 計算天賦效果的實際數值
     */
    private calculateEffectValue(effect: TalentEffect, talentLevel: number): number {
        return effect.base_value + (effect.per_point_value * talentLevel);
    }

    /**
     * 將天賦效果應用到屬性列表上
     * 這是與武器屬性系統整合的關鍵方法
     */
    public applyTalentEffectsToProperties(
        characterId: string,
        baseProperties: PropertyValue[]
    ): PropertyValue[] {
        const talentEffects = this.calculateTalentEffects(characterId);
        if (talentEffects.length === 0) {
            return baseProperties;
        }

        // 複製基礎屬性，避免修改原始資料
        const modifiedProperties = [...baseProperties];

        // 建立屬性索引以便快速查找
        const propertyMap = new Map<PropertyTypeValue, number>();
        modifiedProperties.forEach((prop, index) => {
            propertyMap.set(prop.type, index);
        });

        console.log(`🌟 應用 ${talentEffects.length} 個天賦效果到角色 ${characterId}`);

        for (const appliedEffect of talentEffects) {
            this.applyTalentEffectToProperty(
                appliedEffect,
                modifiedProperties,
                propertyMap
            );
        }

        return modifiedProperties;
    }

    /**
     * 應用單個天賦效果到屬性
     */
    private applyTalentEffectToProperty(
        appliedEffect: AppliedTalentEffect,
        properties: PropertyValue[],
        propertyMap: Map<PropertyTypeValue, number>
    ): void {
        // 直接使用天賦屬性類型，不再需要轉換！
        const propertyType = appliedEffect.propertyName;

        // 檢查屬性是否存在
        const propertyIndex = propertyMap.get(propertyType);
        if (propertyIndex === undefined) {
            // 如果屬性不存在，創建新的屬性
            const newProperty: PropertyValue = {
                type: propertyType,
                value: 0,
                description: `天賦效果: ${appliedEffect.talentId}`
            };
            properties.push(newProperty);
            propertyMap.set(propertyType, properties.length - 1);

            this.modifyPropertyValue(newProperty, appliedEffect.value, appliedEffect.modifierType);
        } else {
            // 修改現有屬性
            const existingProperty = properties[propertyIndex];
            this.modifyPropertyValue(existingProperty, appliedEffect.value, appliedEffect.modifierType);
        }

        console.log(`  ✨ ${appliedEffect.talentId}: ${propertyType} ${appliedEffect.modifierType} ${appliedEffect.value}`);
    }

    /**
     * 根據修改器類型修改屬性值
     */
    private modifyPropertyValue(
        property: PropertyValue,
        modifierValue: number,
        modifierType: ModifierType
    ): void {
        // 確保 value 是數字類型
        let currentValue = Array.isArray(property.value) ? property.value[0] : property.value;

        switch (modifierType) {
            case ModifierType.FLAT_ADD:
                currentValue += modifierValue;
                break;
            case ModifierType.PERCENTAGE_ADD:
                currentValue = currentValue * (1 + modifierValue / 100);
                break;
            case ModifierType.PERCENTAGE_MULTIPLY:
                currentValue = currentValue * (modifierValue / 100);
                break;
            default:
                console.warn(`不支援的修改器類型: ${modifierType}`);
                return;
        }

        // 更新屬性值
        if (Array.isArray(property.value)) {
            property.value[0] = currentValue;
        } else {
            property.value = currentValue;
        }
    }

    /**
     * 獲取角色天賦統計資訊
     */
    public getTalentStats(characterId: string): any {
        const talentData = this.getCharacterTalents(characterId);
        const effects = this.calculateTalentEffects(characterId);

        return {
            characterId,
            totalTalentPoints: talentData.totalPoints,
            usedTalentPoints: talentData.usedPoints,
            availableTalentPoints: talentData.availablePoints,
            allocatedTalentsCount: Object.keys(talentData.allocatedTalents).length,
            activeEffectsCount: effects.length,
            talentBreakdown: Object.entries(talentData.allocatedTalents).map(([talentId, level]) => ({
                talentId,
                level,
                effects: effects.filter(e => e.talentId === talentId).length
            }))
        };
    }

    /**
     * 更新角色等級時調用，重新計算天賦點數
     */
    public updateCharacterLevel(characterId: string, newLevel: number): void {
        const talentData = this.getCharacterTalents(characterId);
        const newTotalPoints = this.calculateTotalTalentPoints(newLevel);

        if (newTotalPoints > talentData.totalPoints) {
            const gainedPoints = newTotalPoints - talentData.totalPoints;
            talentData.totalPoints = newTotalPoints;
            talentData.availablePoints = talentData.totalPoints - talentData.usedPoints;
            console.log(`🌟 角色 ${characterId} 升級到 ${newLevel} 級，獲得 ${gainedPoints} 天賦點`);
        }
    }
}

/**
 * 便利函數 - 初始化天賦管理器
 */
export async function initializeTalentManager(): Promise<void> {
    await TalentManager.getInstance().initialize();
}
