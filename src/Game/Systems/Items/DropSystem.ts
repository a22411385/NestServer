import { GameRoom } from "../../../Colyseus/Rooms/GameRoom";
import { ServerGameUnit } from "../../../Colyseus/Schema/Unit/GameUnit";
import { ServerEnemy } from "../../../Colyseus/Schema/Unit/Enemy";
import { ServerItem } from "../../../Colyseus/Schema/Item/ServerItem";
import { Vector2 } from "../../../Colyseus/Schema/Unit/GameUnit";
import { BattleMathUtils } from "../../../Util/BattleMathUtils";
import {
    WEAPON_DROP_CONFIG,
    BASIC_DROP_CONFIG
} from "./DropRates";
import { WeaponSystemFacade } from "../Battle/WeaponSystemFacade";
import { ServerHero } from "@/Colyseus/Schema/Unit/Hero";


/**
 * 物品掉落系統管理器 - 新版本
 * 使用統一配置管理器和智能掉落算法
 */
export class DropSystem {
    private room: GameRoom;

    constructor(room: GameRoom) {
        this.room = room;
    }

    /**
     * 🔧 初始化掉落系統
     */
    public async initialize(): Promise<void> {
        try {
            // 確保武器系統已初始化
            WeaponSystemFacade.initialize();
            console.log('✅ DropSystem 初始化完成');
        } catch (error) {
            console.error('❌ DropSystem 初始化失敗:', error);
        }
    }

    /**
     * 🎯 處理敵人死亡掉落 - 新版智能系統
     */
    public handleEnemyDeath(enemy: ServerEnemy, killer: ServerGameUnit): void {
        console.log(`🎁 處理敵人 ${enemy.name}(Lv.${enemy.lv}) 的智能掉落...`);

        const dropPosition = this.getRandomDropPosition(enemy.position);
        const droppedItems = this.generateSmartDropItems(enemy, dropPosition.x, dropPosition.y);

        // 將掉落物品加入房間
        droppedItems.forEach(item => {
            this.room.state.gameCore.mapItems.push(item);
        });

        console.log(`✅ 敵人 ${enemy.name} 掉落 ${droppedItems.length} 個物品`);
    }

    /**
     * 🎯 智能掉落物品生成系統
     */
    private generateSmartDropItems(enemy: ServerEnemy, x: number, y: number): ServerItem[] {
        const items: ServerItem[] = [];
        // 掉落材料
        // 尚未實作

        return items;
    }

    /**
     * 🎯 武器掉落機率計算
     */
    private calculateWeaponDropRate(enemy: ServerEnemy): number {
        // 基礎武器掉落率
        let baseRate = WEAPON_DROP_CONFIG.baseDropRate;

        // 等級調整
        const enemyLevel = enemy.lv || 1;
        baseRate += enemyLevel * WEAPON_DROP_CONFIG.levelMultiplier;

        // 最大掉落率限制
        return Math.min(WEAPON_DROP_CONFIG.maxDropRate, baseRate);
    }

    /**
     * 🎯 機率判定
     */
    private rollDrop(probability: number): boolean {
        return BattleMathUtils.rollProbability(probability);
    }

    /**
     * 🎯 計算經驗值掉落
     *  可能依照英雄裝備或天賦變化
     */
    private calculateExpDrop(enemy: ServerEnemy, killer: ServerHero): number {
        const enemyLevel = enemy.lv || 1;
        const baseAmount = BASIC_DROP_CONFIG.exp.baseAmount;
        const levelMultiplier = BASIC_DROP_CONFIG.exp.levelMultiplier;
        const randomRange = BASIC_DROP_CONFIG.exp.randomRange;

        return Math.floor(enemyLevel * baseAmount * levelMultiplier + Math.random() * randomRange);
    }

    /**
     * 🎯 計算金幣掉落
     */
    private calculateGoldDrop(enemy: ServerEnemy, killer: ServerHero): number {
        const enemyLevel = enemy.lv || 1;
        const baseAmount = BASIC_DROP_CONFIG.gold.baseAmount;
        const levelMultiplier = BASIC_DROP_CONFIG.gold.levelMultiplier;
        const randomRange = BASIC_DROP_CONFIG.gold.randomRange;

        return Math.floor(enemyLevel * baseAmount * levelMultiplier + BattleMathUtils.randomFloatRange(0, randomRange));
    }

    /**
     * 獲取隨機掉落位置（在原位置周圍散佈）
     */
    private getRandomDropPosition(basePosition: Vector2): Vector2 {
        const scatterRadius = 50; // 散佈半徑
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * scatterRadius;

        return new Vector2(
            basePosition.x + Math.cos(angle) * distance,
            basePosition.y + Math.sin(angle) * distance
        );
    }

    /**
     * 清理系統資源
     */
    public cleanup(): void {
        console.log('🧹 DropSystem 已清理');
    }
}
