import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";
/**
 * 火球術 - 投射武器範例
 */
export class Fireball extends ProjectileWeapon {
    // 🆕 可選：強化等級（用於示範）
    private enhanceLevel: number = 0;

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

        // ✅ 武器物理屬性
        this.projectileSpeed = 200; // 火球飛行速度
        this.accuracy = 0.95;       // 95% 命中率

        // 根據配置的固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('burn')) {
            console.log(`🔥 火球具有燃燒效果`);
        }
        if (fixedProps.includes('area_of_effect')) {
            console.log(`💥 火球會發射爆炸彈藥`);
        }
    }
}
