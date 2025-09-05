import { MeleeWeapon } from "../Baisc/MeleeWeapon";
import { AttackResult } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 球棒 - 近戰武器範例
 * 特點：自動瞄準最近敵人，扇形攻擊範圍，可擊退敵人，每秒攻擊一次
 * 使用新的屬性系統，所有特殊屬性通過 WeaponPropertyService 應用
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class BaseballBat extends MeleeWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用球棒特定的配置
     */
    protected applyMeleeSpecificConfig(): void {
        // 球棒特有邏輯（如果需要）
        console.log(`🏏 球棒特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);

        // 根據配置的固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('knockback')) {
            console.log(`💥 球棒具有擊退效果`);
        }
        if (fixedProps.includes('stun')) {
            console.log(`😵 球棒具有暈眩效果`);
        }
        if (fixedProps.includes('sweep_angle')) {
            console.log(`🌊 球棒具有扇形攻擊`);
        }
    }

    // BaseballBat 使用父類的 tryAttack 邏輯即可
    // 所有特殊屬性（擊退、暈眩、掃射角度等）都通過屬性系統應用

    /**
     * 可以重寫目標選擇邏輯（如果需要特殊的攻擊模式）
     */
    // protected findValidTargets(
    //     attacker: ServerGameUnit,
    //     potentialTargets: ServerGameUnit[]
    // ): ServerGameUnit[] {
    //     // 這裡可以實現 BaseballBat 特有的目標選擇邏輯
    //     return super.findValidTargets(attacker, potentialTargets);
    // }
}
