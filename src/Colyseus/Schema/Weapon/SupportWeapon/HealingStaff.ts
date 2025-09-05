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

        // 治療法杖特有設定
        this.healAmount = 15;        // 基礎治療量（會被屬性增強）
        this.buffDuration = 5000;    // 增益持續時間
        this.supportRadius = 200;    // 較大的支援範圍
        this.canTargetSelf = true;   // 可以自我治療

        // 根據配置的固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('heal_amount')) {
            console.log(`💚 治療法杖具有強化治療效果`);
        }
        if (fixedProps.includes('support_radius')) {
            console.log(`🌐 治療法杖具有擴大支援範圍`);
        }
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
