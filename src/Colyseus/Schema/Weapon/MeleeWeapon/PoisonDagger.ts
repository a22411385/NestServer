import { MeleeWeapon } from "../Baisc/MeleeWeapon";

/**
 * 毒刃 - 近戰武器
 * 特色：中毒效果 + 攻速提升
 * 固定屬性：poison, attack_speed
 * 隨機屬性：agility, strength, critical_chance, life_steal
 */
export class PoisonDagger extends MeleeWeapon {
    constructor() {
        super(
            'poison_dagger',
            60,    // attackRange - 短距離
            20,    // baseDamage
            800    // attackSpeed - 攻速很快
        );

        this.name = "毒刃";
        this.rarity = "uncommon";
    }

    // 使用父類 MeleeWeapon 的 tryAttack 邏輯
    // 所有特殊效果（中毒、攻速提升等）都通過屬性系統應用
}
