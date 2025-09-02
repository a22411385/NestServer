import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { UnitType } from "../../Colyseus/Schema/GameState";

// 🆕 使用統一類型定義
import { EnemyType, EnemyConfig } from "@/Types";

/**
 * 敵人工廠類 - 負責創建不同類型的敵人
 */
export class EnemyFactory {
    private static enemyConfigs: Map<EnemyType, EnemyConfig> = new Map([
        [EnemyType.NORMAL_ZOMBIE, {
            type: EnemyType.NORMAL_ZOMBIE,
            hp: 100,
            maxHp: 100,
            attackDamage: 15,
            moveSpeed: 60,
            scale: 1.0,
            collisionWidth: 32,
            collisionHeight: 64,
            experienceReward: 10,
            goldReward: 5
        }],
        [EnemyType.FAST_ZOMBIE, {
            type: EnemyType.FAST_ZOMBIE,
            hp: 80,
            maxHp: 80,
            attackDamage: 12,
            moveSpeed: 100,
            scale: 0.9,
            collisionWidth: 28,
            collisionHeight: 28,
            experienceReward: 15,
            goldReward: 8
        }],
        [EnemyType.STRONG_ZOMBIE, {
            type: EnemyType.STRONG_ZOMBIE,
            hp: 200,
            maxHp: 200,
            attackDamage: 25,
            moveSpeed: 40,
            scale: 1.3,
            collisionWidth: 40,
            collisionHeight: 40,
            experienceReward: 30,
            goldReward: 15
        }],
        [EnemyType.BOSS_ZOMBIE, {
            type: EnemyType.BOSS_ZOMBIE,
            hp: 500,
            maxHp: 500,
            attackDamage: 40,
            moveSpeed: 80,
            scale: 1.8,
            collisionWidth: 60,
            collisionHeight: 60,
            experienceReward: 100,
            goldReward: 50
        }]
    ]);

    /**
     * 創建指定類型的敵人
     * @param enemyType 敵人類型
     * @param position 生成位置
     * @param waveNumber 波次編號（影響屬性加成）
     * @returns 創建的敵人實例
     */
    public static createEnemy(
        enemyType: EnemyType,
        position: Vector2,
        waveNumber: number = 1
    ): ServerEnemy {
        const config = this.enemyConfigs.get(enemyType);
        if (!config) {
            throw new Error(`Unknown enemy type: ${enemyType}`);
        }

        // 根據波次計算屬性加成
        const waveMultiplier = this.getWaveMultiplier(waveNumber);

        const enemy = new ServerEnemy();
        enemy.type = UnitType.enemy;
        enemy.lv = enemyType;

        // 基礎屬性設置
        enemy.hp = Math.floor(config.hp * waveMultiplier.hp);
        enemy.maxHp = Math.floor(config.maxHp * waveMultiplier.hp);
        enemy.attackDamage = Math.floor(config.attackDamage * waveMultiplier.damage);
        enemy.moveSpeed = config.moveSpeed;

        // 視覺和碰撞屬性
        enemy.scale = config.scale * waveMultiplier.scale;
        enemy.collisionWidth = config.collisionWidth;
        enemy.collisionHeight = config.collisionHeight;

        // 位置設置
        enemy.position = new Vector2(position.x, position.y);

        // 敵人名稱
        enemy.name = this.getEnemyName(enemyType, waveNumber);

        console.log(`🧟 Created ${enemy.name} at (${position.x}, ${position.y}) - Wave ${waveNumber}`);
        return enemy;
    }

    /**
     * 根據波次獲取屬性加成倍數
     */
    private static getWaveMultiplier(waveNumber: number): { hp: number; damage: number; scale: number } {
        const baseMultiplier = 1 + (waveNumber - 1) * 0.15; // 每波15%增長

        return {
            hp: baseMultiplier,
            damage: 1 + (waveNumber - 1) * 0.1, // 每波10%攻擊力增長
            scale: Math.min(1 + (waveNumber - 1) * 0.05, 1.5) // 每波5%大小增長，最大1.5倍
        };
    }

    /**
     * 獲取敵人名稱
     */
    private static getEnemyName(enemyType: EnemyType, waveNumber: number): string {
        const baseNames: Record<EnemyType, string> = {
            [EnemyType.NORMAL_ZOMBIE]: "普通殭屍",
            [EnemyType.FAST_ZOMBIE]: "快速殭屍",
            [EnemyType.STRONG_ZOMBIE]: "強壯殭屍",
            [EnemyType.BOSS_ZOMBIE]: "殭屍王"
        };

        const baseName = baseNames[enemyType] || "未知敵人";
        return waveNumber > 1 ? `${baseName} Lv.${waveNumber}` : baseName;
    }

    /**
     * 獲取敵人配置
     */
    public static getEnemyConfig(enemyType: EnemyType): EnemyConfig | undefined {
        return this.enemyConfigs.get(enemyType);
    }

    /**
     * 根據波次推薦敵人類型組合
     */
    public static getRecommendedEnemyTypes(waveNumber: number): EnemyType[] {
        if (waveNumber <= 3) {
            return [EnemyType.NORMAL_ZOMBIE];
        } else if (waveNumber <= 6) {
            return [EnemyType.NORMAL_ZOMBIE, EnemyType.FAST_ZOMBIE];
        } else if (waveNumber <= 10) {
            return [EnemyType.NORMAL_ZOMBIE, EnemyType.FAST_ZOMBIE, EnemyType.STRONG_ZOMBIE];
        } else if (waveNumber % 5 === 0) { // Boss 波次
            return [EnemyType.BOSS_ZOMBIE];
        } else {
            return [EnemyType.FAST_ZOMBIE, EnemyType.STRONG_ZOMBIE];
        }
    }

    /**
     * 計算波次敵人總數
     */
    public static calculateEnemyCount(waveNumber: number): number {
        // Boss 波次只有一個 Boss
        if (waveNumber % 5 === 0) {
            return 1;
        }

        // 普通波次：基礎10個，每波+1個，最多100個
        return Math.min(10 + waveNumber * 5, 100);
    }
}
