import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";
import { AttackResult, AmmoOverrideConfig } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 火球術 - 投射武器範例
 * 
 * 🎯 重構後的設計：
 * - 武器只負責：攻擊時機、物理屬性（速度、射程、傷害）
 * - 彈藥負責：命中邏輯、範圍效果（在 ExplosiveProjectile 中定義）
 * - 強化系統：通過 getAmmoOverride() 修改彈藥配置
 * 
 * 📝 配置流程：
 * 1. 武器指定彈藥：projectileClass = 'ExplosiveProjectile'
 * 2. 彈藥提供默認值：ExplosiveProjectile.getConfig() → { pierceCount: 1, areaOfEffect: 80 }
 * 3. 武器可覆蓋：getAmmoOverride() → { areaOfEffect: 150 }（如果強化）
 * 4. 最終配置：{ pierceCount: 1, areaOfEffect: 150 }
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

    /**
     * 🆕 可選：覆蓋彈藥配置（強化系統示範）
     * 
     * @example
     * // +5 強化：增加 50% AOE
     * const fireball = new Fireball();
     * fireball.enhance(5);
     * // 爆炸範圍：80 + (5 * 10) = 130
     */
    protected getAmmoOverride(): AmmoOverrideConfig | null {
        if (this.enhanceLevel > 0) {
            return {
                areaOfEffect: 80 + (this.enhanceLevel * 10), // 每級+10 AOE
            };
        }
        return null; // 不強化時使用彈藥默認值
    }

    /**
     * 🆕 強化方法（示範用）
     */
    public enhance(level: number): void {
        this.enhanceLevel = level;
        console.log(`🔥 火球強化至 +${level}，AOE: ${80 + level * 10}`);
    }

    /**
     * 可以重寫 AOE 傷害計算
     */
    // protected findAOETargets(
    //     potentialTargets: ServerGameUnit[],
    //     explosionCenter: ServerGameUnit,
    //     radius: number
    // ): ServerGameUnit[] {
    //     // 可以實現特殊的 AOE 邏輯，比如火球術的燃燒效果
    //     return super.findAOETargets(potentialTargets, explosionCenter, radius);
    // }
}
