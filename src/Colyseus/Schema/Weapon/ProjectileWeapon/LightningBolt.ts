import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";

/**
 * 閃電箭 - 投射武器
 * 特色：連鎖攻擊 + 暈眩
 * 固定屬性：chain_attack, stun
 * 隨機屬性：intelligence, agility, critical_chance, piercing
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class LightningBolt extends ProjectileWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用閃電箭特定的配置
     */
    protected applyProjectileSpecificConfig(): void {
        // 閃電箭特有配置
        console.log(`⚡ 閃電箭特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);

    }

    // 使用父類 ProjectileWeapon 的 tryAttack 邏輯
    // 所有特殊效果（連鎖攻擊、暈眩等）都通過屬性系統應用
}
