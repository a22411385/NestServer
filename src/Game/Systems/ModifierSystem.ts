/**
 * 修改器系統 - POE 風格
 * 管理所有屬性修改器並計算最終數值
 */

import { ModifierType } from '@/Types/Equipment/WeaponPropertyTypes';

/**
 * 修改器定義
 */
export interface Modifier {
    id: string;                    // 修改器ID
    stat: string;                  // 影響的屬性 (damage, attack_speed, burn_chance)
    value: number;                 // 數值
    type: ModifierType;            // 修改器類型
    tags: string[];                // 標籤列表
    conditions?: string[];         // 條件列表
    source: string;                // 來源 (talent:sword_mastery, weapon:fire_sword)
}

/**
 * 修改器管理器
 */
export class ModifierManager {
    private modifiers: Modifier[] = [];

    /**
     * 添加修改器
     */
    addModifier(modifier: Modifier): void {
        this.modifiers.push(modifier);
    }

    /**
     * 移除修改器
     */
    removeModifier(modifierId: string): void {
        this.modifiers = this.modifiers.filter(m => m.id !== modifierId);
    }

    /**
     * 移除來源的所有修改器
     */
    removeModifiersBySource(source: string): void {
        this.modifiers = this.modifiers.filter(m => m.source !== source);
    }

    /**
     * 獲取所有修改器
     */
    getAllModifiers(): Modifier[] {
        return [...this.modifiers];
    }

    /**
     * 獲取影響特定屬性的修改器
     */
    getModifiersForStat(stat: string): Modifier[] {
        return this.modifiers.filter(m => m.stat === stat);
    }

    /**
     * 獲取具有特定標籤的修改器
     */
    getModifiersWithTags(tags: string[], matchMode: 'any' | 'all' = 'any'): Modifier[] {
        return this.modifiers.filter(modifier => {
            if (matchMode === 'any') {
                return tags.some(tag => modifier.tags.includes(tag));
            } else {
                return tags.every(tag => modifier.tags.includes(tag));
            }
        });
    }

    /**
     * 🔥 核心計算方法：計算屬性的最終值
     * 使用 POE 公式：(基礎 + Σflat) × (1 + Σincreased/100) × Πmore
     */
    calculateStat(stat: string, baseValue: number, context?: any): number {
        const relevantMods = this.getModifiersForStat(stat);

        // 如果沒有修改器，直接返回基礎值
        if (relevantMods.length === 0) return baseValue;

        // 分類修改器
        const flatMods: number[] = [];
        const increasedMods: number[] = [];
        const moreMods: number[] = [];

        for (const mod of relevantMods) {
            // TODO: 檢查條件
            // if (mod.conditions && !this.checkConditions(mod.conditions, context)) {
            //     continue;
            // }

            switch (mod.type) {
                case ModifierType.FLAT:
                    flatMods.push(mod.value);
                    break;
                case ModifierType.INCREASED:
                    increasedMods.push(mod.value);
                    break;
                case ModifierType.MORE:
                    moreMods.push(mod.value);
                    break;
            }
        }

        // 步驟 1: 基礎值 + 所有固定加成
        let result = baseValue + flatMods.reduce((sum, val) => sum + val, 0);

        // 步驟 2: 應用所有 increased (加法疊加)
        const totalIncreased = increasedMods.reduce((sum, val) => sum + val, 0);
        result *= (1 + totalIncreased / 100);

        // 步驟 3: 應用所有 more (乘法疊加)
        for (const moreValue of moreMods) {
            result *= (1 + moreValue / 100);
        }

        return result;
    }

    /**
     * 獲取特定類型的修改器總和
     */
    getModifierSum(stat: string, type: ModifierType): number {
        return this.modifiers
            .filter(m => m.stat === stat && m.type === type)
            .reduce((sum, m) => sum + m.value, 0);
    }

    /**
     * 清除所有修改器
     */
    clear(): void {
        this.modifiers = [];
    }

    /**
     * 檢查條件（未來實作）
     */
    private checkConditions(conditions: string[], context: any): boolean {
        // TODO: 實作條件檢查系統
        return true;
    }
}

/**
 * 修改器構建器 - 方便創建修改器
 */
export class ModifierBuilder {
    private modifier: Partial<Modifier> = {};

    static create(): ModifierBuilder {
        return new ModifierBuilder();
    }

    withId(id: string): this {
        this.modifier.id = id;
        return this;
    }

    withStat(stat: string): this {
        this.modifier.stat = stat;
        return this;
    }

    withValue(value: number): this {
        this.modifier.value = value;
        return this;
    }

    withType(type: ModifierType): this {
        this.modifier.type = type;
        return this;
    }

    withTags(...tags: string[]): this {
        this.modifier.tags = tags;
        return this;
    }

    withSource(source: string): this {
        this.modifier.source = source;
        return this;
    }

    withConditions(...conditions: string[]): this {
        this.modifier.conditions = conditions;
        return this;
    }

    build(): Modifier {
        if (!this.modifier.id || !this.modifier.stat || this.modifier.value === undefined ||
            !this.modifier.type || !this.modifier.source) {
            throw new Error('Modifier is missing required fields');
        }

        return {
            id: this.modifier.id,
            stat: this.modifier.stat,
            value: this.modifier.value,
            type: this.modifier.type,
            tags: this.modifier.tags || [],
            conditions: this.modifier.conditions,
            source: this.modifier.source
        };
    }
}
