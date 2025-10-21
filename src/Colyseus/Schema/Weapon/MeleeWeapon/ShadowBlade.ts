import { MeleeWeapon } from "../Baisc/MeleeWeapon";

/**
 * 暗影刃 - 近戰武器
 * 特色：高暴擊機率 + 生命偷取
 * 固定屬性：critical_chance, life_steal
 * 隨機屬性：agility, strength, critical_damage, piercing
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class ShadowBlade extends MeleeWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }



    // 使用父類 MeleeWeapon 的 tryAttack 邏輯
    // 所有特殊效果（暴擊、生命偷取等）都通過屬性系統應用
}
