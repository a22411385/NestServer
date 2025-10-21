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



    // 使用父類 MeleeWeapon 的 tryAttack 邏輯
    // 所有特殊效果（中毒、攻速提升等）都通過屬性系統應用
}
