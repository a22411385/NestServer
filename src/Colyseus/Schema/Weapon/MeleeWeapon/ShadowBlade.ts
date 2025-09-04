import { MeleeWeapon } from "../Baisc/MeleeWeapon";

/**
 * 暗影刃 - 近戰武器
 * 特色：高暴擊率 + 生命偷取
 * 固定屬性：critical_chance, life_steal
 * 隨機屬性：agility, strength, critical_damage, piercing
 */
export class ShadowBlade extends MeleeWeapon {
    constructor() {
        super(
            'shadow_blade',
            70,    // attackRange - 中短距離
            32,    // baseDamage - 中高傷害
            1000   // attackSpeed - 中等攻速
        );

        this.name = "暗影刃";
        this.rarity = "epic";
    }

    // 使用父類 MeleeWeapon 的 tryAttack 邏輯
    // 所有特殊效果（暴擊、生命偷取等）都通過屬性系統應用
}
