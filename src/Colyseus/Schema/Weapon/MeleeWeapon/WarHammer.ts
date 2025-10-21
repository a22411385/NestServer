import { MeleeWeapon } from "../Baisc/MeleeWeapon";

/**
 * 戰錘 - 近戰武器
 * 特色：擊退 + 濺射傷害 + 暈眩
 * 固定屬性：knockback, splash_damage, stun
 * 隨機屬性：strength, vitality, critical_damage, sweep_angle
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class WarHammer extends MeleeWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }


    // 使用父類 MeleeWeapon 的 tryAttack 邏輯
    // 所有特殊效果（擊退、濺射、暈眩等）都通過屬性系統應用
}
