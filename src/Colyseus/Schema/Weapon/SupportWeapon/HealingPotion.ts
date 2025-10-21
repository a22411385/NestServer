import { SupportWeapon } from "../Baisc/SupportWeapon";
import { AttackResult } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 治療藥劑 - 支援武器範例
 * 特點：範圍治療，可以對自己使用，提供短時間增益
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class HealingPotion extends SupportWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用治療藥劑特定的配置
     */
    protected applySupportSpecificConfig(): void {
        // 治療藥劑特有配置
        console.log(`🧪 治療藥劑特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);
        console.log(`💚 治療藥劑可以治療和提供增益效果`);
    }

    /**
     * 實現支援類型
     */
    public getSupportType(): 'heal' | 'buff' | 'shield' | 'hybrid' {
        return 'hybrid'; // 既可以治療又可以提供增益
    }

    /**
     * 可以重寫支援需求判斷邏輯
     */
    protected needsSupport(target: ServerGameUnit): boolean {
        // 治療藥劑的邏輯：血量低於60%時需要治療
        return target.hp < target.maxHp * 0.6;
    }

    /**
     * 可以重寫支援目標選擇邏輯
     */
    protected findSupportTargets(
        user: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[] {
        // 可以自定義支援目標選擇邏輯
        // 例如：治療藥劑優先治療血量最少的友軍
        return super.findSupportTargets(user, potentialTargets);
    }
}
