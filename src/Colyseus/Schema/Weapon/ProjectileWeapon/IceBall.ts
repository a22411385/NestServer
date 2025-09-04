import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";

/**
 * 冰球 - 投射武器
 * 特色：冰凍效果 + 減速
 * 固定屬性：freeze, slow
 * 隨機屬性：intelligence, vitality, projectile_speed, area_of_effect
 */
export class IceBall extends ProjectileWeapon {
    constructor() {
        super(
            'iceball',
            380,   // attackRange - 遠距離
            28,    // baseDamage
            2200,  // attackSpeed
            200,   // projectileSpeed - 彈道速度
            0,     // pierceCount - 不穿透
            50,    // areaOfEffect - 小範圍AOE
            0.95   // accuracy - 高精確度
        );

        this.name = "冰球";
        this.rarity = "epic";
    }

    // 使用父類 ProjectileWeapon 的 tryAttack 邏輯
    // 所有特殊效果（冰凍、減速等）都通過屬性系統應用
}
