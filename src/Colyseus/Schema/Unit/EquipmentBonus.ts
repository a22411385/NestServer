/**
 * 裝備加成範例和工具
 * 使用統一的屬性系統
 */

import { AttributeBonus, BuffEffect } from "@/Types";

// 範例裝備加成 - 使用新的統一屬性系統
export const EXAMPLE_BONUSES = {
    SWORD: {
        attackBonus: 15,
        attackMultiplier: 0.1, // 10% 攻擊力加成
        criticalRate: 0.05,    // 5% 暴擊率
        strengthBonus: 3       // 力量+3
    } as AttributeBonus,

    ARMOR: {
        hpBonus: 50,
        hpMultiplier: 0.2,     // 20% 血量加成
        defenseBonus: 25,      // 防禦力+25
        vitalityBonus: 5       // 體力+5
    } as AttributeBonus,

    BOOTS: {
        speedBonus: 2,
        speedMultiplier: 0.15, // 15% 速度加成
        agilityBonus: 4,       // 敏捷+4
        dodgeRate: 0.03        // 3% 閃避率
    } as AttributeBonus,

    MAGIC_STAFF: {
        attackBonus: 20,
        intelligenceBonus: 6,   // 智力+6
        manaSteal: 0.1,        // 10% 魔法偷取
        healAmount: 15         // 治療量+15
    } as AttributeBonus,

    FIRE_RING: {
        burnChance: 0.15,      // 15% 燃燒機率
        fireResistance: 0.2,   // 20% 火焰抗性
        criticalDamage: 0.3    // 30% 暴擊傷害加成
    } as AttributeBonus
};

// 範例 Buff 效果
export const EXAMPLE_BUFFS = {
    STRENGTH_POTION: {
        id: 'strength_potion',
        type: 'attack_boost',
        value: 25,
        duration: 30000,
        remaining: 30000
    } as BuffEffect,

    HEALTH_POTION: {
        id: 'health_potion',
        type: 'hp_boost',
        value: 100,
        duration: 60000,
        remaining: 60000
    } as BuffEffect,

    SPEED_BOOST: {
        id: 'speed_boost',
        type: 'speed_boost',
        value: 1.5,
        duration: 15000,
        remaining: 15000
    } as BuffEffect
};
