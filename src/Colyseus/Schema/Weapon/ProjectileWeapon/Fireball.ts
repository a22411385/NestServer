import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";
import { WeaponAttackResult } from "../Baisc/WeaponBasic";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 火球術 - 投射武器範例
 * 特點：遠程攻擊，有爆炸範圍，可穿透一個敵人
 */
export class Fireball extends ProjectileWeapon {
    constructor() {
        super(
            'fireball',          // weaponId
            300,                 // 攻擊範圍
            40,                  // 基礎傷害
            2000,                // 攻擊間隔 2秒
            200,                 // 彈道速度
            1,                   // 穿透數量
            80,                  // 爆炸半徑
            0.95                 // 命中精確度 95%
        );
    }

    // Fireball 使用父類的 tryAttack 邏輯即可
    // 如果需要特殊邏輯，可以重寫特定方法

    /**
     * 可以重寫選擇主要目標的邏輯（如果需要特殊的瞄準邏輯）
     */
    // protected selectPrimaryTarget(
    //     attacker: ServerGameUnit,
    //     potentialTargets: ServerGameUnit[]
    // ): ServerGameUnit | null {
    //     // 這裡可以實現 Fireball 特有的目標選擇邏輯
    //     // 例如：優先攻擊血量最多的敵人
    //     return super.selectPrimaryTarget(attacker, potentialTargets);
    // }

    /**
     * 可以重寫 AOE 傷害計算
     */
    // protected findAOETargets(
    //     potentialTargets: ServerGameUnit[],
    //     explosionCenter: ServerGameUnit,
    //     radius: number
    // ): ServerGameUnit[] {
    //     // 可以實現特殊的 AOE 邏輯，比如火球術的燃燒效果
    //     return super.findAOETargets(potentialTargets, explosionCenter, radius);
    // }
}
