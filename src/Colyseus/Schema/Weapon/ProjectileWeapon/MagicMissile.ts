import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";

/**
 * 魔法飛彈 - 投射武器
 * 特色：穿透次數 + 投射速度
 * 固定屬性：pierce_count, projectile_speed
 * 隨機屬性：intelligence, vitality, critical_chance, area_of_effect
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class MagicMissile extends ProjectileWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用魔法飛彈特定的配置
     */
    protected applyProjectileSpecificConfig(): void {
        // 魔法飛彈特有配置
        console.log(`✨ 魔法飛彈特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);

        // 魔法飛彈特有的投射物設定
        this.projectileSpeed = 350;  // 快速彈道
        this.accuracy = 0.99;        // 幾乎必中
        this.pierceCount = 3;        // 高穿透
        this.areaOfEffect = 30;      // 小範圍AOE

        // 根據配置的固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('pierce_count')) {
            console.log(`🎯 魔法飛彈具有高穿透效果`);
        }
        if (fixedProps.includes('projectile_speed')) {
            console.log(`⚡ 魔法飛彈具有快速彈道`);
        }
    }

    // 使用父類 ProjectileWeapon 的 tryAttack 邏輯
    // 所有特殊效果（穿透、投射速度等）都通過屬性系統應用
}
