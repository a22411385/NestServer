import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";
/**
 * 火球術 - 投射武器範例
 */
export class Fireball extends ProjectileWeapon {

    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用火球特定的配置
     * ✅ 只設定武器屬性（速度、精度）
     * ❌ 不再設定彈藥屬性（pierceCount, areaOfEffect）
     */
    protected applyProjectileSpecificConfig(): void {
        console.log(`🔥 火球配置已應用 - ${this.weaponConfig?.name}`);
    }
}
