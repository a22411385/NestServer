import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";

/**
 * 閃電箭 - 投射武器
 * 特色：連鎖攻擊 + 暈眩
 * 固定屬性：chain_attack, stun
 * 隨機屬性：intelligence, agility, critical_chance, piercing
 */
export class LightningBolt extends ProjectileWeapon {
    constructor() {
        super(
            'lightning_bolt',
            500,   // attackRange - 超遠距離
            35,    // baseDamage
            1800,  // attackSpeed
            400,   // projectileSpeed - 極快彈道
            1,     // pierceCount - 可穿透
            0,     // areaOfEffect - 無AOE（使用連鎖攻擊）
            0.98   // accuracy - 極高精確度
        );

        this.name = "閃電箭";
        this.rarity = "epic";
    }

    // 使用父類 ProjectileWeapon 的 tryAttack 邏輯
    // 所有特殊效果（連鎖攻擊、暈眩等）都通過屬性系統應用
}
