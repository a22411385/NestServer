import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";

/**
 * 爆裂箭 - 投射武器
 * 特色：濺射傷害 + 擊退
 * 固定屬性：splash_damage, knockback
 * 隨機屬性：agility, strength, critical_damage, area_of_effect
 */
export class ExplosiveArrow extends ProjectileWeapon {
    constructor() {
        super(
            'explosive_arrow',
            450,   // attackRange - 遠距離
            28,    // baseDamage
            2200,  // attackSpeed
            250,   // projectileSpeed - 中等彈道
            0,     // pierceCount - 不穿透（爆炸消耗）
            100,   // areaOfEffect - 大範圍爆炸
            0.92   // accuracy - 中高精確度
        );

        this.name = "爆裂箭";
        this.rarity = "rare";
    }

    // 使用父類 ProjectileWeapon 的 tryAttack 邏輯
    // 所有特殊效果（濺射傷害、擊退等）都通過屬性系統應用
}
