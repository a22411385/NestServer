import { MeleeWeapon } from "../Baisc/MeleeWeapon";
import { WeaponAttackResult } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 球棒 - 近戰武器範例
 * 特點：自動瞄準最近敵人，扇形攻擊範圍，可擊退敵人，每秒攻擊一次
 */
export class BaseballBat extends MeleeWeapon {
    constructor() {
        super(
            'baseball_bat',      // weaponId
            120,                 // 攻擊範圍 (增加到120)
            25,                  // 基礎傷害
            1000,                // 攻擊間隔 1秒
            15,                  // 擊退力度 (增加到15)
            Math.PI * 0.6,       // 攻擊角度 (108度，比90度稍大)
            5                    // 最大攻擊目標數量 (增加到5)
        );
    }

    // BaseballBat 使用父類的 tryAttack 邏輯即可
    // 如果需要特殊邏輯，可以重寫特定方法

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
