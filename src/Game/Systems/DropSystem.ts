import { GameRoom } from "../../Colyseus/Rooms/GameRoom";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";
import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { ServerItem } from "../../Colyseus/Schema/Item/ServerItem";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { ConfigManager } from "../Managers/ConfigManager";
import { BattleMathUtils } from "../../Util/BattleMathUtils";
import {
    WEAPON_DROP_CONFIG,
    BASIC_DROP_CONFIG
} from "./DropRates";
import { WeaponSystemFacade } from "./WeaponSystemFacade";
import { WeaponData } from "../../Colyseus/Schema/Weapon/WeaponData";
import { WeaponQuality } from "@/Types/Equipment/WeaponPropertyTypes";


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

        // 1. 必定掉落：經驗值
        const expAmount = this.calculateExpDrop(enemy);
        items.push(ServerItem.createExp(x, y, expAmount));

        // 2. 高機率掉落：金幣
        if (this.rollDrop(BASIC_DROP_CONFIG.gold.dropRate)) {
            const goldAmount = this.calculateGoldDrop(enemy);
            items.push(ServerItem.createGold(x, y, goldAmount));
        }

        // 4. 🎯 武器掉落：使用武器管理器生成完整武器
        if (this.rollDrop(this.calculateWeaponDropRate(enemy))) {
            const weaponData = this.generateCompleteWeapon(enemy);
            if (weaponData) {
                try {
                    // 使用 WeaponData 創建掉落物品（包含完整屬性）
                    const weaponItem = ServerItem.createFromWeaponData(weaponData, x, y);
                    items.push(weaponItem);
                    console.log(`🗡️ 掉落武器: ${weaponData.name} (品質: ${weaponData.quality}, 等級: ${weaponData.level})`);
                } catch (error) {
                    console.error('❌ 創建武器掉落物品失敗:', error);
                }
            } else {
                console.warn(`⚠️ 無法生成武器，跳過武器掉落`);
            }
        }

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
     * 🎯 生成完整武器數據（使用武器管理器）
     */
    private generateCompleteWeapon(enemy: ServerEnemy): WeaponData {
        try {
            const enabledWeapons = ConfigManager.getEnabledWeapons();
            if (enabledWeapons.length === 0) {
                console.warn('❌ 沒有可用的武器配置');
                throw new Error('沒有可用的武器配置');
            }

            // 隨機選擇武器
            const weaponConfig = enabledWeapons[Math.floor(Math.random() * enabledWeapons.length)];
            const weaponId = weaponConfig.id;

            // 使用 WeaponSystemFacade 創建完整武器
            const { data: weaponData } = WeaponSystemFacade.createAndGetWeapon(weaponId);
            if (!weaponData) {
                //   console.warn(`❌ 無法創建武器數據: ${weaponId}`);
                throw new Error(`無法創建武器數據: ${weaponId}`);
            }

            // 根據敵人等級調整武器等級
            const enemyLevel = enemy.lv || 1;
            const weaponLevel = Math.max(1, enemyLevel + Math.floor(Math.random() * 3) - 1);

            // 設置武器等級（這會觸發重新計算屬性）
            weaponData.level = weaponLevel;

            // 根據配置的品質機率重新確定品質（可選）
            const desiredQuality = this.rollQualityFromConfig(WEAPON_DROP_CONFIG.qualityRates);
            if (desiredQuality !== weaponData.quality) {
                // 如果需要不同品質，重新生成（簡化處理）
                weaponData.quality = desiredQuality;
            }

            console.log(`🔧 生成完整武器: ${weaponId} Lv.${weaponLevel} (品質: ${weaponData.quality})`);
            return weaponData;
        } catch (error) {
            console.error('❌ 生成完整武器失敗:', error);
            throw error;
        }
    }



    /**
     * 🎯 根據配置機率抽取品質（轉換為 WeaponQuality 枚舉）
     */
    private rollQualityFromConfig(rates: Record<string, number>): WeaponQuality {
        const qualityString = this.rollQuality(rates);

        // 轉換字符串到 WeaponQuality 枚舉
        switch (qualityString.toLowerCase()) {
            case 'common':
            case 'normal':
                return WeaponQuality.NORMAL;
            case 'uncommon':
            case 'magic':
                return WeaponQuality.MAGIC;
            case 'rare':
                return WeaponQuality.RARE;
            case 'epic':
                return WeaponQuality.EPIC;
            case 'legendary':
                return WeaponQuality.LEGENDARY;
            default:
                return WeaponQuality.NORMAL;
        }
    }
    /**
     * 🎯 品質抽取
     */
    private rollQuality(rates: Record<string, number>): string {
        const roll = Math.random();
        let cumulative = 0;

        for (const [quality, rate] of Object.entries(rates)) {
            cumulative += rate;
            if (roll <= cumulative) {
                return quality;
            }
        }
        return 'common';
    }

    /**
     * 🎯 機率判定
     */
    private rollDrop(probability: number): boolean {
        return BattleMathUtils.rollProbability(probability);
    }

    /**
     * 🎯 計算經驗值掉落
     */
    private calculateExpDrop(enemy: ServerEnemy): number {
        const enemyLevel = enemy.lv || 1;
        const baseAmount = BASIC_DROP_CONFIG.exp.baseAmount;
        const levelMultiplier = BASIC_DROP_CONFIG.exp.levelMultiplier;
        const randomRange = BASIC_DROP_CONFIG.exp.randomRange;

        return Math.floor(enemyLevel * baseAmount * levelMultiplier + Math.random() * randomRange);
    }

    /**
     * 🎯 計算金幣掉落
     */
    private calculateGoldDrop(enemy: ServerEnemy): number {
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
