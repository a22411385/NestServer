import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";

/**
 * 魔法飛彈 - 投射武器
 * 特色：穿透次數 + 投射速度
 * 固定屬性：pierce_count, projectile_speed
 * 隨機屬性：intelligence, vitality, critical_chance, area_of_effect
 */
export class MagicMissile extends ProjectileWeapon {
    constructor() {
        super(
            'magic_missile',
            600,   // attackRange - 超遠距離
            22,    // baseDamage
            1500,  // attackSpeed
            350,   // projectileSpeed - 快速彈道
            3,     // pierceCount - 高穿透
            30,    // areaOfEffect - 小範圍AOE
            0.99   // accuracy - 幾乎必中
        );

        this.name = "魔法飛彈";
        this.rarity = "rare";
    }

    // 使用父類 ProjectileWeapon 的 tryAttack 邏輯
    // 所有特殊效果（穿透、投射速度等）都通過屬性系統應用
}
