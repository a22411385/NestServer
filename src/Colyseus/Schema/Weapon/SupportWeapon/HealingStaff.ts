import { SupportWeapon } from "../Baisc/SupportWeapon";

/**
 * 治療法杖 - 支援武器
 * 特色：治療量 + 支援範圍
 * 固定屬性：heal_amount, support_radius
 * 隨機屬性：intelligence, vitality, buff_duration, area_of_effect
 */
export class HealingStaff extends SupportWeapon {
    constructor() {
        super(
            'healing_staff',
            300,   // supportRange - 中距離
            15,    // baseDamage - 低攻擊力（這裡實際是治療量）
            3000,  // attackSpeed - 慢速
            5,     // buffDuration - 增益持續時間
            200,   // supportRadius - 支援範圍
            true   // canTargetSelf - 可以自我治療
        );

        this.name = "治療法杖";
        this.rarity = "rare";
    }

    /**
     * 支援類型：純治療
     */
    public getSupportType(): 'heal' | 'buff' | 'shield' | 'hybrid' {
        return 'heal';
    }

    // 使用父類 SupportWeapon 的 tryAttack 邏輯
    // 所有特殊效果（治療、支援範圍等）都通過屬性系統應用
}
