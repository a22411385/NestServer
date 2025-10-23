import { ServerEnemy } from "../../../Colyseus/Schema/Unit/Enemy";
import { BattleMathUtils } from "../../../Util/BattleMathUtils";

/**
 * 敵人協調系統 - 處理敵人間的群體行為和避免相互干擾
 */
export class EnemyCoordinationSystem {
    private static instance: EnemyCoordinationSystem;
    private coordinationRadius: number = 60;
    private maxCoordinationGroup: number = 4;

    public static getInstance(): EnemyCoordinationSystem {
        if (!EnemyCoordinationSystem.instance) {
            EnemyCoordinationSystem.instance = new EnemyCoordinationSystem();
        }
        return EnemyCoordinationSystem.instance;
    }

    /**
     * 協調敵人群體移動，避免互相干擾
     */
    public coordinateEnemyMovement(enemies: ServerEnemy[]): void {
        const aliveEnemies = enemies.filter(enemy => !enemy.isDead);

        // 將敵人分組進行協調
        const groups = this.groupNearbyEnemies(aliveEnemies);

        for (const group of groups) {
            this.coordinateGroup(group);
        }
    }

    /**
     * 將相近的敵人分組
     */
    private groupNearbyEnemies(enemies: ServerEnemy[]): ServerEnemy[][] {
        const groups: ServerEnemy[][] = [];
        const processed = new Set<string>();

        for (const enemy of enemies) {
            if (processed.has(enemy.id)) continue;

            const group = [enemy];
            processed.add(enemy.id);

            // 找到附近的敵人
            for (const other of enemies) {
                if (processed.has(other.id) || other === enemy) continue;

                const distance = BattleMathUtils.calculateDistanceVector(other.position, enemy.position);

                if (distance < this.coordinationRadius && group.length < this.maxCoordinationGroup) {
                    group.push(other);
                    processed.add(other.id);
                }
            }

            if (group.length > 1) {
                groups.push(group);
            }
        }

        return groups;
    }

    /**
     * 協調群體行為
     */
    private coordinateGroup(group: ServerEnemy[]): void {
        // 計算群體中心
        const center = this.calculateGroupCenter(group);

        // 為每個敵人分配位置偏移
        group.forEach((enemy, index) => {
            const angle = (index / group.length) * Math.PI * 2;
            const offset = 30; // 偏移距離

            const offsetX = Math.cos(angle) * offset;
            const offsetY = Math.sin(angle) * offset;

            // 設置期望位置（相對於群體中心）
            (enemy as any).desiredOffset = { x: offsetX, y: offsetY };
        });
    }

    /**
     * 計算群體中心位置
     */
    private calculateGroupCenter(group: ServerEnemy[]): { x: number; y: number } {
        const center = { x: 0, y: 0 };

        for (const enemy of group) {
            center.x += enemy.position.x;
            center.y += enemy.position.y;
        }

        center.x /= group.length;
        center.y /= group.length;

        return center;
    }

    /**
     * 取得協調系統統計資料
     */
    public getCoordinationStats(enemies: ServerEnemy[]): any {
        const aliveEnemies = enemies.filter(enemy => !enemy.isDead);
        const groups = this.groupNearbyEnemies(aliveEnemies);

        return {
            totalEnemies: aliveEnemies.length,
            groupsCount: groups.length,
            largestGroup: groups.length > 0 ? Math.max(...groups.map(g => g.length)) : 0,
            averageGroupSize: groups.length > 0 ? groups.reduce((sum, g) => sum + g.length, 0) / groups.length : 0
        };
    }
}
