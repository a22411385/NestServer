import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";

/**
 * 爆裂箭 - 投射武器
 * 特色：濺射傷害 + 擊退
 * 固定屬性：splash_damage, knockback
 * 隨機屬性：agility, strength, critical_damage, area_of_effect
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class ExplosiveArrow extends ProjectileWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用爆裂箭特定的配置
     */
    protected applyProjectileSpecificConfig(): void {
        // 爆裂箭特有配置
        console.log(`💥 爆裂箭特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);
        
        // 爆裂箭特有的投射物設定
        this.projectileSpeed = 250;  // 中等彈道速度
        this.accuracy = 0.92;        // 中高精確度
        this.pierceCount = 0;        // 不穿透（爆炸消耗）
        this.areaOfEffect = 100;     // 大範圍爆炸
        
        // 根據配置的固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('splash_damage')) {
            console.log(`🌊 爆裂箭具有濺射傷害`);
        }
        if (fixedProps.includes('knockback')) {
            console.log(`💨 爆裂箭具有擊退效果`);
        }
    }

    // 使用父類 ProjectileWeapon 的 tryAttack 邏輯
    // 所有特殊效果（濺射傷害、擊退等）都通過屬性系統應用
}
