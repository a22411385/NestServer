import { ProjectileWeapon } from "../Baisc/ProjectileWeapon";
import { AttackResult } from "@/Types";
import { ServerGameUnit } from "../../Unit/GameUnit";

/**
 * 火球術 - 投射武器範例
 * 特點：遠程攻擊，有爆炸範圍，可穿透一個敵人
 * 🆕 完全依賴配置初始化，無需構造函數參數
 */
export class Fireball extends ProjectileWeapon {
    constructor() {
        super(); // 🆕 調用無參數的父類構造函數
    }

    /**
     * 🆕 應用火球特定的配置
     */
    protected applyProjectileSpecificConfig(): void {
        // 火球特有配置
        console.log(`🔥 火球特定配置已應用 - 配置來自: ${this.weaponConfig?.name}`);
        
        // 根據配置設定投射武器屬性
        this.projectileSpeed = 200; // 預設投射物速度
        this.accuracy = 0.95;       // 95% 命中率
        
        // 根據配置的固定屬性進行特殊設置
        const fixedProps = this.getFixedProperties();
        if (fixedProps.includes('burn')) {
            console.log(`🔥 火球具有燃燒效果`);
        }
        if (fixedProps.includes('area_of_effect')) {
            console.log(`💥 火球具有範圍效果`);
            this.areaOfEffect = 80; // 爆炸半徑
        }
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
