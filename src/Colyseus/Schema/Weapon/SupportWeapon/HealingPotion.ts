import { SupportWeapon } from "../Baisc/SupportWeapon";
import { WeaponAttackResult } from "../Baisc/WeaponBasic";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 治療藥劑 - 支援武器範例
 * 特點：範圍治療，可以對自己使用，提供短時間增益
 */
export class HealingPotion extends SupportWeapon {
    constructor() {
        super(
            'healing_potion',    // weaponId
            150,                 // 支援範圍
            30,                  // 治療量
            3000,                // 攻擊間隔 3秒
            5000,                // 增益持續時間 5秒
            100,                 // 支援範圍半徑
            true                 // 可以對自己使用
        );
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
