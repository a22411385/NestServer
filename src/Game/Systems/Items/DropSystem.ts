import { GameRoom } from "../../../Colyseus/Rooms/GameRoom";
import { ServerGameUnit } from "../../../Colyseus/Schema/Unit/GameUnit";
import { ServerEnemy } from "../../../Colyseus/Schema/Unit/Enemy";
import { BattleMathUtils } from "../../../Util/BattleMathUtils";
import { WeaponSystemFacade } from "../Battle/WeaponSystemFacade";
import { ServerHero } from "@/Colyseus/Schema/Unit/Hero";
import { ConfigManager } from "@/Game/Managers/ConfigManager";
import { MaterialConfigDefinition } from "@/Types/Equipment/MaterialTypes";


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

                // 添加素材到玩家背包
                this.addMaterialToHero(hero, materialConfig.id, quantity);
                break; // 一次只掉落一種素材
            }
        }
    }

    /**
     * 🆕 添加素材到玩家背包
     * 支援碎片自動合成功能
     * @param hero 英雄實例
     * @param materialId 素材ID
     * @param quantity 數量
     */
    private addMaterialToHero(hero: ServerHero, materialId: string, quantity: number): void {
        const materialConfig = ConfigManager.getById<MaterialConfigDefinition>('MaterialConfigs', materialId);
        if (!materialConfig) {
            console.error(`❌ 素材配置不存在: ${materialId}`);
            return;
        }

        const currentQuantity = hero.materials.get(materialId) || 0;
        const newQuantity = currentQuantity + quantity;

        // 檢查堆疊上限
        if (newQuantity <= materialConfig.stackSize) {
            hero.materials.set(materialId, newQuantity);
            console.log(`⚒️ ${hero.name} 獲得素材: ${materialConfig.name} x${quantity} (總計: ${newQuantity})`);

            // 🆕 檢查碎片自動合成
            this.checkAndCompositeMaterial(hero, materialConfig, newQuantity);
        } else {
            // 達到堆疊上限
            hero.materials.set(materialId, materialConfig.stackSize);
            console.log(`⚠️ ${hero.name} 獲得素材: ${materialConfig.name} x${quantity} (已達上限: ${materialConfig.stackSize})`);

            // 🆕 即使達到上限也要檢查合成
            this.checkAndCompositeMaterial(hero, materialConfig, materialConfig.stackSize);
        }
    }

    /**
     * 🆕 檢查並合成碎片素材
     * 如果是 CHIP 類型且數量 >= 10，自動合成為成品
     * @param hero 英雄實例
     * @param materialConfig 碎片配置
     * @param currentQuantity 當前數量
     */
    private checkAndCompositeMaterial(
        hero: ServerHero,
        materialConfig: MaterialConfigDefinition,
        currentQuantity: number
    ): void {
        // 只處理碎片類型且有合成配置的素材
        if (materialConfig.category !== 'chip' || !materialConfig.composite) {
            return;
        }

        const COMPOSITE_REQUIREMENT = 10; // 合成需求數量

        // 檢查是否達到合成條件
        if (currentQuantity >= COMPOSITE_REQUIREMENT) {
            // 計算可以合成的次數
            const compositeCount = Math.floor(currentQuantity / COMPOSITE_REQUIREMENT);
            const remainingChips = currentQuantity % COMPOSITE_REQUIREMENT;

            // 扣除碎片
            hero.materials.set(materialConfig.id, remainingChips);

            // 添加成品
            const compositeConfig = ConfigManager.getById<MaterialConfigDefinition>('MaterialConfigs', materialConfig.composite);
            if (compositeConfig) {
                const currentCompositeQuantity = hero.materials.get(materialConfig.composite) || 0;
                const newCompositeQuantity = Math.min(
                    currentCompositeQuantity + compositeCount,
                    compositeConfig.stackSize
                );
                hero.materials.set(materialConfig.composite, newCompositeQuantity);

                console.log(`✨ ${hero.name} 碎片自動合成: ${materialConfig.name} x${COMPOSITE_REQUIREMENT * compositeCount} → ${compositeConfig.name} x${compositeCount}`);

                // 廣播合成事件給客戶端
                this.room.broadcast('material_composite', {
                    playerId: hero.id,
                    chipId: materialConfig.id,
                    chipName: materialConfig.name,
                    chipUsed: COMPOSITE_REQUIREMENT * compositeCount,
                    compositeId: materialConfig.composite,
                    compositeName: compositeConfig.name,
                    compositeCount: compositeCount,
                    remainingChips: remainingChips
                });
            } else {
                console.error(`❌ 合成目標素材不存在: ${materialConfig.composite}`);
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
