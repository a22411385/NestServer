import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { UnitType } from "../../Colyseus/Schema/GameState";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { ConfigManager } from "@/Game/Managers/ConfigManager";
import { EnemyConfigDefinition } from "@/Types";

/**
 * 🔄 敵人工廠類 - 使用動態配置系統
 * 
 * - 從 Google Sheets EnemyConfigs 載入敵人數據
 * - 支持波次相關的敵人生成和屬性縮放
 * - 根據配置權重進行隨機選擇
 * 
 */
export class EnemyFactory {

    /**
     * 🔄 創建指定ID的敵人（使用動態配置）
     * @param enemyId 敵人配置ID (如 'zombie_normal', 'werewolf_hunter')
     * @param position 生成位置
     * @param waveNumber 波次編號（影響等級和屬性加成）
     * @returns 創建的敵人實例
     */
    public static createEnemy(
        enemyId: string,
        position: Vector2,
        waveNumber: number = 1
    ): ServerEnemy {
        const config = ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', enemyId);
        if (!config) {
            throw new Error(`Unknown enemy id: ${enemyId}`);
        }

        // 根據波次計算屬性加成
        const waveMultiplier = this.getWaveMultiplier(waveNumber);

        const enemy = new ServerEnemy();
        enemy.type = UnitType.enemy;

        // ✅ 修復：設置正確的等級 = 波次（用於材料掉落解鎖）
        enemy.lv = waveNumber;

        // 基礎屬性設置（基於配置和波次加成）
        enemy.hp = Math.floor(config.baseHp * waveMultiplier.hp);
        enemy.maxHp = Math.floor(config.baseHp * waveMultiplier.hp);
        enemy.attackDamage = Math.floor(config.baseAttackDamage * waveMultiplier.damage);
        enemy.moveSpeed = config.baseMoveSpeed;

        // 🔧 設置獎勵屬性
        enemy.expReward = Math.floor(config.baseExpReward * waveMultiplier.exp);

        // 視覺和碰撞屬性
        enemy.scale = config.scale * waveMultiplier.scale;
        enemy.collisionWidth = config.collisionWidth;
        enemy.collisionHeight = config.collisionHeight;

        // 位置設置
        enemy.position = new Vector2(position.x, position.y);
        enemy.birthX = position.x;
        enemy.birthY = position.y;

        // 敵人名稱（使用配置的 displayName，支持 {wave} 模板替換）
        enemy.name = config.displayName.replace('{wave}', waveNumber.toString());

        console.log(`🧟 Created ${enemy.name} (${enemyId}) at (${position.x}, ${position.y}) - Wave ${waveNumber} Lv.${enemy.lv}`);
        return enemy;
    }

    /**
     * 🆕 根據波次隨機生成敵人
     * @param position 生成位置
     * @param waveNumber 波次編號
     * @returns 創建的敵人實例，如果該波次無可用敵人則返回 null
     */
    public static createRandomEnemyByWave(
        position: Vector2,
        waveNumber: number
    ): ServerEnemy | null {
        const enemyId = ConfigManager.getRandomEnemyIdByWave(waveNumber);
        if (!enemyId) {
            console.warn(`⚠️ No available enemies for wave ${waveNumber}`);
            return null;
        }

        return this.createEnemy(enemyId, position, waveNumber);
    }

    /**
     * 根據波次獲取屬性加成倍數
     */
    private static getWaveMultiplier(waveNumber: number): { hp: number; damage: number; scale: number; exp: number } {
        const baseMultiplier = 1 + (waveNumber - 1) * 0.15; // 每波15%增長

        return {
            hp: baseMultiplier,
            damage: 1 + (waveNumber - 1) * 0.1, // 每波10%攻擊力增長
            scale: Math.min(1 + (waveNumber - 1) * 0.05, 1.5), // 每波5%大小增長，最大1.5倍
            exp: baseMultiplier // 經驗值也隨波次增長
        };
    }

    /**
     * 🆕 根據敵人ID和波次獲取金幣獎勵
     * @param enemyId 敵人配置ID
     * @param waveNumber 波次編號
     * @returns 金幣獎勵數量
     */
    public static getGoldReward(enemyId: string, waveNumber: number = 1): number {
        const config = ConfigManager.getById<EnemyConfigDefinition>('EnemyConfigs', enemyId);
        if (!config) return 0;

        const waveMultiplier = this.getWaveMultiplier(waveNumber);
        return Math.floor(config.baseGoldReward * waveMultiplier.exp);
    }

    /**
     * 🆕 根據波次獲取可生成的敵人ID列表
     * @param waveNumber 波次編號
     * @returns 可生成的敵人ID數組
     */
    public static getAvailableEnemyIds(waveNumber: number): string[] {
        const enemies = ConfigManager.getEnemiesByWave(waveNumber);
        return enemies.map(enemy => enemy.id);
    }

    /**
     * 🆕 根據波次和AI類型篩選敵人
     * @param waveNumber 波次編號
     * @param aiType AI類型 (如 'boss', 'chase', 'aggressive')
     * @returns 匹配的敵人ID數組
     */
    public static getEnemiesByAIType(waveNumber: number, aiType: string): string[] {
        const enemies = ConfigManager.getEnemiesByWave(waveNumber);
        return enemies
            .filter(enemy => enemy.aiType === aiType)
            .map(enemy => enemy.id);
    }

    /**
     * 計算波次敵人總數
     */
    public static calculateEnemyCount(waveNumber: number): number {
        // 檢查是否為 Boss 波次（每5波）
        const bossEnemies = this.getEnemiesByAIType(waveNumber, 'boss');
        if (bossEnemies.length > 0 && waveNumber % 5 === 0) {
            return 1; // Boss 波次只有一個 Boss
        }

        // 普通波次：基礎10個，每波+5個，最多100個
        return Math.min(10 + waveNumber * 5, 100);
    }
}
