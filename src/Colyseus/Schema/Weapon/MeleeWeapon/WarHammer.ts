import { MeleeWeapon } from "../Baisc/MeleeWeapon";

/**
 * 戰錘 - 近戰武器
 * 特色：擊退 + 濺射傷害 + 暈眩
 * 固定屬性：knockback, splash_damage, stun
 * 隨機屬性：strength, vitality, critical_damage, sweep_angle
 */
export class WarHammer extends MeleeWeapon {
    constructor() {
        super(
            'war_hammer',
            100,   // attackRange - 中距離
            45,    // baseDamage - 高傷害
            2500   // attackSpeed - 攻速慢
        );

        this.name = "戰錘";
        this.rarity = "rare";
    }

    // 使用父類 MeleeWeapon 的 tryAttack 邏輯
    // 所有特殊效果（擊退、濺射、暈眩等）都通過屬性系統應用
}
