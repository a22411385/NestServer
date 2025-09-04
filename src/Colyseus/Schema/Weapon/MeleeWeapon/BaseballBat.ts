import { MeleeWeapon } from "../Baisc/MeleeWeapon";
import { WeaponAttackResult } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 球棒 - 近戰武器範例
 * 特點：自動瞄準最近敵人，扇形攻擊範圍，可擊退敵人，每秒攻擊一次
 * 使用新的屬性系統，所有特殊屬性通過 WeaponPropertyService 應用
 */
export class BaseballBat extends MeleeWeapon {
    constructor() {
        // 只提供基礎參數，特殊屬性由屬性系統管理
        super(
            'baseball_bat',      // weaponId
            80,                  // 基礎攻擊範圍 (會被屬性系統覆寫)
            20,                  // 基礎傷害 (會被屬性系統覆寫)
            1200                 // 基礎攻擊間隔 (會被屬性系統覆寫)
        );
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
