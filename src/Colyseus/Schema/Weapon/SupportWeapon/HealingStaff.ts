import { SupportWeapon } from "../Baisc/SupportWeapon";

/**
 * 治療法杖 - 支援武器
 * 特色：治療量 + 支援範圍
 * 固定屬性：heal_amount, support_radius
 * 隨機屬性：intelligence, vitality, buff_duration, area_of_effect
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class HealingStaff extends SupportWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用治療法杖特定的配置
     */
    protected applySupportSpecificConfig(): void {
        // 治療法杖特有配置
        console.log(`🪄 治療法杖特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);

    }

    /**
     * 支援類型：純治療
     */
    public getSupportType(): 'heal' | 'buff' | 'shield' | 'hybrid' {
        return 'heal';
    }

    // 使用父類 SupportWeapon 的 tryAttack 邏輯
    // 所有特殊效果（治療、支援範圍等）都通過屬性系統應用
}
