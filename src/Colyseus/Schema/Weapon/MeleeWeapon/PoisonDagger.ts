import { MeleeWeapon } from "../Baisc/MeleeWeapon";

/**
 * 毒刃 - 近戰武器
 * 特色：中毒效果 + 攻速提升
 * 固定屬性：poison, attack_speed
 * 隨機屬性：agility, strength, critical_chance, life_steal
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class PoisonDagger extends MeleeWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用毒刃特定的配置
     */
    protected applyMeleeSpecificConfig(): void {
        // 毒刃特有邏輯
        console.log(`🗡️ 毒刃特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);
        
        // 根據配置的固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('poison')) {
            console.log(`☠️ 毒刃具有中毒效果`);
        }
        if (fixedProps.includes('attack_speed')) {
            console.log(`⚡ 毒刃具有攻速提升`);
        }
    }

    // 使用父類 MeleeWeapon 的 tryAttack 邏輯
    // 所有特殊效果（中毒、攻速提升等）都通過屬性系統應用
}
