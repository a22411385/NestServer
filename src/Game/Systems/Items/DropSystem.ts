import { GameRoom } from "../../../Colyseus/Rooms/GameRoom";
import { ServerGameUnit } from "../../../Colyseus/Schema/Unit/GameUnit";
import { ServerEnemy } from "../../../Colyseus/Schema/Unit/Enemy";
import { BattleMathUtils } from "../../../Util/BattleMathUtils";
import { WeaponSystemFacade } from "../Battle/WeaponSystemFacade";
import { ServerHero } from "@/Colyseus/Schema/Unit/Hero";
import { ConfigManager } from "@/Game/Managers/ConfigManager";


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
     * 🎯 處理敵人死亡掉落 - 直接給擊殺者獎勵
     */
    public handleEnemyDeath(enemy: ServerEnemy, killer: ServerGameUnit): void {
        // 🎯 檢查是否有擊殺者（區分正常擊殺和系統移除）
        if (!enemy.killedBy) {
            console.log(`⚠️ 敵人 ${enemy.name} 被系統移除，不觸發掉落獎勵`);
            return;
        }

        // 只有玩家角色才獲得獎勵
        if (!(killer instanceof ServerHero)) {
            return;
        }

        const hero = killer as ServerHero;
        const enemyLevel = enemy.lv || 1;

        console.log(`🎁 處理敵人 ${enemy.name}(Lv.${enemyLevel}) 的掉落獎勵...`);

        // 1. 給予金幣
        const goldAmount = this.calculateGoldDrop(enemy, hero);
        if (goldAmount > 0) {
            hero.gold += goldAmount;
            console.log(`💰 ${hero.name} 獲得金幣: ${goldAmount}`);
        }

        // 2. 給予經驗值
        const expAmount = this.calculateExpDrop(enemy, hero);
        if (expAmount > 0) {
            hero.addExperience(expAmount);
            console.log(`⭐ ${hero.name} 獲得經驗: ${expAmount}`);
        }

        // 3. 掉落素材 (直接加入玩家素材庫)
        this.dropMaterialsToPlayer(enemy, hero);

        console.log(`✅ 獎勵發放完成`);
    }

    /**
     * 🎯 掉落素材給玩家 (直接加入素材庫)
     */
    private dropMaterialsToPlayer(enemy: ServerEnemy, hero: ServerHero): void {
        const enemyLevel = enemy.lv || 1;

        // 獲取該等級可掉落的素材列表
        const availableMaterials = ConfigManager.getMaterialsByEnemyLevel(enemyLevel);

        if (availableMaterials.length === 0) {
            return;
        }

        // 遍歷所有可能掉落的素材
        for (const materialConfig of availableMaterials) {
            // 檢查是否成功掉落 (機率判定)
            const dropChance = Math.random() * 100;
            if (dropChance <= materialConfig.baseDropRate) {
                // 隨機生成掉落數量
                const quantity = Math.floor(
                    Math.random() * (materialConfig.maxDropQuantity - materialConfig.minDropQuantity + 1)
                ) + materialConfig.minDropQuantity;

                // 直接加入玩家的素材庫 (使用 MapSchema)
                const currentQuantity = hero.materials.get(materialConfig.id) || 0;
                const newQuantity = currentQuantity + quantity;

                // 檢查堆疊上限
                if (newQuantity <= materialConfig.stackSize) {
                    hero.materials.set(materialConfig.id, newQuantity);
                    console.log(`⚒️ ${hero.name} 獲得素材: ${materialConfig.name} x${quantity} (總計: ${newQuantity})`);
                } else {
                    // 達到堆疊上限
                    hero.materials.set(materialConfig.id, materialConfig.stackSize);
                    console.log(`⚠️ ${hero.name} 獲得素材: ${materialConfig.name} x${quantity} (已達上限: ${materialConfig.stackSize})`);
                }
                break; // 一次只掉落一種素材
            }
        }
    }

    /**
     * 🎯 計算經驗值掉落
     *  可能依照英雄裝備或天賦變化
     */
    private calculateExpDrop(enemy: ServerEnemy, killer: ServerHero): number {
        const enemyLevel = enemy.lv || 1;
        const baseAmount = enemy.expReward;
        const levelMultiplier = 1;
        const randomRange = 1;

        return Math.floor(enemyLevel * baseAmount * levelMultiplier + Math.random() * randomRange);
    }

    /**
     * 🎯 計算金幣掉落
     */
    private calculateGoldDrop(enemy: ServerEnemy, killer: ServerHero): number {
        const enemyLevel = enemy.lv || 1;
        const baseAmount = 25;
        const levelMultiplier = 1;
        const randomRange = 1;

        return Math.floor(enemyLevel * baseAmount * levelMultiplier + BattleMathUtils.randomFloatRange(0, randomRange));
    }
    /**
     * 清理系統資源
     */
    public cleanup(): void {
        console.log('🧹 DropSystem 已清理');
    }
}
