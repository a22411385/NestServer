// 裝備加成接口
export interface EquipmentBonus {
    // 固定數值加成
    hpBonus?: number;
    attackBonus?: number;
    speedBonus?: number;
    mpBonus?: number;

    // 百分比加成 (0.1 = 10%)
    hpMultiplier?: number;
    attackMultiplier?: number;
    speedMultiplier?: number;
    mpMultiplier?: number;

    // 特殊效果
    critRate?: number;
    dodgeRate?: number;
    lifeSteal?: number;
}

// Buff 效果接口
export interface BuffEffect {
    id: string;
    type: 'hp_boost' | 'attack_boost' | 'speed_boost' | 'damage_reduction';
    value: number;
    duration: number;
    remaining: number;
}

// 範例裝備加成
export const EXAMPLE_BONUSES = {
    SWORD: {
        attackBonus: 15,
        attackMultiplier: 0.1, // 10% 攻擊力加成
    } as EquipmentBonus,

    ARMOR: {
        hpBonus: 50,
        hpMultiplier: 0.2, // 20% 血量加成
    } as EquipmentBonus,

    BOOTS: {
        speedBonus: 2,
        speedMultiplier: 0.15, // 15% 速度加成
    } as EquipmentBonus
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
    } as BuffEffect
};
