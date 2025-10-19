import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";

/**
 * 冰球 - 投射武器
 * 特色：冰凍效果 + 減速
 * 固定屬性：freeze, slow
 * 隨機屬性：intelligence, vitality, projectile_speed, area_of_effect
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class IceBall extends ProjectileWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用冰球特定的配置
     */
    protected applyProjectileSpecificConfig(): void {
        // 冰球特有配置
        console.log(`❄️ 冰球特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);

        // 冰球特有的投射物設定
        this.projectileSpeed = 200;  // 中等彈道速度
        this.accuracy = 0.95;        // 高精確度

        // 根據配置的固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('freeze')) {
            console.log(`🧊 冰球具有冰凍效果`);
        }
        if (fixedProps.includes('slow')) {
            console.log(`🐌 冰球具有減速效果`);
        }
    }

    // 使用父類 ProjectileWeapon 的 tryAttack 邏輯
    // 所有特殊效果（冰凍、減速等）都通過屬性系統應用
}
