import { Vector2 } from "../../../Colyseus/Schema/Unit/GameUnit";
import { ServerGameUnit } from "../../../Colyseus/Schema/Unit/GameUnit";

// 🆕 使用統一類型定義
import { SpawnType, SpawnConfig } from "./types";

/**
 * 生成位置管理器 - 負責計算和驗證敵人生成位置
 */
export class SpawnManager {
    private mapWidth: number;
    private mapHeight: number;
    constructor(mapWidth: number, mapHeight: number) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
    }

    /**
     * 根據配置獲取生成位置列表
     */
    public getSpawnPositions(
        config: SpawnConfig,
        existingUnits: ServerGameUnit[] = []
    ): Vector2[] {
        const positions: Vector2[] = [];

        switch (config.type) {
            case SpawnType.RANDOM_EDGE:
                // 🆕 無邊界模式：在玩家周圍圓周生成
                return this.getCircleAroundPlayersPositions(config, existingUnits);

            case SpawnType.CIRCLE_FORMATION:
                return this.getCircleFormationPositions(config, existingUnits);

            case SpawnType.CORNERS:
                return this.getCornerPositions(config, existingUnits);

            case SpawnType.BOSS_CENTER:
                return this.getBossCenterPositions(config, existingUnits);

            default:
                // 🆕 無邊界模式：在玩家周圍圓周生成
                return this.getCircleAroundPlayersPositions(config, existingUnits);
        }
    }

    /**
     * 🆕 在玩家周圍圓周生成敵人（無邊界模式）
     * 在距離所有玩家半徑 2000 的圓周上隨機生成
     */
    private getCircleAroundPlayersPositions(config: SpawnConfig, existingUnits: ServerGameUnit[]): Vector2[] {
        const positions: Vector2[] = [];
        const spawnRadius = 2000; // 固定半徑 2000

        // 獲取所有玩家位置
        const playerUnits = existingUnits.filter(unit => unit.type === 0); // hero type

        if (playerUnits.length === 0) {
            //console.warn('⚠️ No players found, spawning at origin');
            // 如果沒有玩家，在原點周圍生成
            for (let i = 0; i < config.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const x = Math.cos(angle) * spawnRadius;
                const y = Math.sin(angle) * spawnRadius;
                positions.push(new Vector2(x, y));
            }
            return positions;
        }

        // 計算所有玩家的中心點
        let centerX = 0;
        let centerY = 0;
        for (const player of playerUnits) {
            centerX += player.position.x;
            centerY += player.position.y;
        }
        centerX /= playerUnits.length;
        centerY /= playerUnits.length;

        // 在玩家中心周圍的圓周上生成
        for (let i = 0; i < config.count; i++) {
            let position: Vector2 | null = null;

            for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
                // 隨機角度
                const angle = Math.random() * Math.PI * 2;
                // 半徑加入一些隨機變化（1900-2100）
                const radiusVariation = spawnRadius + (Math.random() - 0.5) * 200;

                const x = centerX + Math.cos(angle) * radiusVariation;
                const y = centerY + Math.sin(angle) * radiusVariation;

                const candidatePos = new Vector2(x, y);

                // 🆕 無邊界模式：不檢查地圖邊界
                if (this.isValidSpawnPositionNoBounds(candidatePos, config, existingUnits, positions)) {
                    position = candidatePos;
                    break;
                }
            }

            if (position) {
                positions.push(position);
                //  console.log(`🎯 Found spawn position ${i + 1}/${config.count} around players: (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
            } else {
                // 如果找不到有效位置，強制在圓周上生成
                const angle = (i / config.count) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * spawnRadius;
                const y = centerY + Math.sin(angle) * spawnRadius;
                positions.push(new Vector2(x, y));

            }
        }

        return positions;
    }

    /**
     * 獲取隨機邊緣位置（保留舊方法以防需要）
     */
    private getRandomEdgePositions(config: SpawnConfig, existingUnits: ServerGameUnit[]): Vector2[] {
        const positions: Vector2[] = [];
        const edges = ['north', 'south', 'east', 'west'];

        for (let i = 0; i < config.count; i++) {
            let position: Vector2 | null = null;

            for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
                const edge = edges[Math.floor(Math.random() * edges.length)];
                const candidatePos = this.getEdgePosition(edge);

                if (this.isValidSpawnPosition(candidatePos, config, existingUnits, positions)) {
                    position = candidatePos;
                    break;
                }
            }

            if (position) {
                positions.push(position);
                console.log(`🎯 Found spawn position ${i + 1}/${config.count}: (${position.x}, ${position.y})`);
            } else {
                console.warn(`⚠️ Could not find valid spawn position after ${config.maxAttempts} attempts`);
            }
        }

        return positions;
    }

    /**
     * 獲取圓形陣型位置
     */
    private getCircleFormationPositions(config: SpawnConfig, existingUnits: ServerGameUnit[]): Vector2[] {
        const positions: Vector2[] = [];
        const radius = Math.min(this.mapWidth, this.mapHeight) * 0.3; // 30% 地圖大小的圓形
        const angleStep = (Math.PI * 2) / config.count;

        for (let i = 0; i < config.count; i++) {
            const angle = i * angleStep;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const position = new Vector2(x, y);

            if (this.isValidSpawnPosition(position, config, existingUnits, positions)) {
                positions.push(position);
            }
        }

        return positions;
    }

    /**
     * 獲取角落位置
     */
    private getCornerPositions(config: SpawnConfig, existingUnits: ServerGameUnit[]): Vector2[] {
        const positions: Vector2[] = [];
        const margin = 100; // 距離邊界的間距

        const corners = [
            new Vector2(-this.mapWidth / 2 + margin, -this.mapHeight / 2 + margin), // 左上
            new Vector2(this.mapWidth / 2 - margin, -this.mapHeight / 2 + margin),  // 右上
            new Vector2(-this.mapWidth / 2 + margin, this.mapHeight / 2 - margin),  // 左下
            new Vector2(this.mapWidth / 2 - margin, this.mapHeight / 2 - margin)    // 右下
        ];

        // 隨機選擇角落
        const shuffledCorners = [...corners].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(config.count, shuffledCorners.length); i++) {
            const corner = shuffledCorners[i];
            if (this.isValidSpawnPosition(corner, config, existingUnits, positions)) {
                positions.push(corner);
            }
        }

        return positions;
    }

    /**
     * 獲取 Boss 中心位置
     */
    private getBossCenterPositions(config: SpawnConfig, existingUnits: ServerGameUnit[]): Vector2[] {
        const centerPosition = new Vector2(0, 0);

        if (this.isValidSpawnPosition(centerPosition, config, existingUnits, [])) {
            return [centerPosition];
        }

        // 如果中心被佔用，找附近的位置
        for (let radius = 50; radius <= 200; radius += 50) {
            const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

            for (const angle of angles) {
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const position = new Vector2(x, y);

                if (this.isValidSpawnPosition(position, config, existingUnits, [])) {
                    return [position];
                }
            }
        }

        console.warn("⚠️ Could not find valid boss spawn position");
        return [centerPosition]; // 強制返回中心位置
    }

    /**
     * 獲取邊緣位置
     */
    private getEdgePosition(edge: string): Vector2 {
        const margin = 50; // 距離邊界的最小間距

        switch (edge) {
            case 'north':
                return new Vector2(
                    (Math.random() - 0.5) * (this.mapWidth - margin * 2),
                    -this.mapHeight / 2 + margin
                );
            case 'south':
                return new Vector2(
                    (Math.random() - 0.5) * (this.mapWidth - margin * 2),
                    this.mapHeight / 2 - margin
                );
            case 'east':
                return new Vector2(
                    this.mapWidth / 2 - margin,
                    (Math.random() - 0.5) * (this.mapHeight - margin * 2)
                );
            case 'west':
                return new Vector2(
                    -this.mapWidth / 2 + margin,
                    (Math.random() - 0.5) * (this.mapHeight - margin * 2)
                );
            default:
                return new Vector2(0, 0);
        }
    }

    /**
     * 計算兩點之間的距離
     */
    private calculateDistance(pos1: Vector2, pos2: Vector2): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 🆕 檢查位置是否有效（無邊界版本）
     */
    private isValidSpawnPositionNoBounds(
        position: Vector2,
        config: SpawnConfig,
        existingUnits: ServerGameUnit[],
        currentPositions: Vector2[]
    ): boolean {
        // 🆕 不檢查地圖邊界

        // 檢查與玩家的距離（確保不會太近）
        const playerUnits = existingUnits.filter(unit => unit.type === 0); // hero type
        for (const player of playerUnits) {
            const distance = this.calculateDistance(position, player.position);
            // 確保至少距離玩家 1800 以上
            if (distance < Math.max(config.minDistanceFromPlayers, 1800)) {
                return false;
            }
        }

        // 檢查與其他敵人的距離
        const enemyUnits = existingUnits.filter(unit => unit.type === 1); // enemy type
        for (const enemy of enemyUnits) {
            const distance = this.calculateDistance(position, enemy.position);
            if (distance < config.minDistanceBetweenEnemies) {
                return false;
            }
        }

        // 檢查與當前已選位置的距離
        for (const existingPos of currentPositions) {
            const distance = this.calculateDistance(position, existingPos);
            if (distance < config.minDistanceBetweenEnemies) {
                return false;
            }
        }

        return true;
    }

    /**
     * 檢查位置是否有效（有邊界版本）
     */
    private isValidSpawnPosition(
        position: Vector2,
        config: SpawnConfig,
        existingUnits: ServerGameUnit[],
        currentPositions: Vector2[]
    ): boolean {
        // 檢查是否在地圖範圍內
        if (!this.isWithinMapBounds(position)) {
            return false;
        }

        // 檢查與玩家的距離
        const playerUnits = existingUnits.filter(unit => unit.type === 0); // hero type
        for (const player of playerUnits) {
            const distance = this.calculateDistance(position, player.position);
            if (distance < config.minDistanceFromPlayers) {
                return false;
            }
        }

        // 檢查與其他敵人的距離
        const enemyUnits = existingUnits.filter(unit => unit.type === 1); // enemy type
        for (const enemy of enemyUnits) {
            const distance = this.calculateDistance(position, enemy.position);
            if (distance < config.minDistanceBetweenEnemies) {
                return false;
            }
        }

        // 檢查與當前已選位置的距離
        for (const existingPos of currentPositions) {
            const distance = this.calculateDistance(position, existingPos);
            if (distance < config.minDistanceBetweenEnemies) {
                return false;
            }
        }

        return true;
    }

    /**
     * 檢查位置是否在地圖範圍內
     */
    private isWithinMapBounds(position: Vector2): boolean {
        const margin = 30; // 邊界緩衝
        return position.x >= -this.mapWidth / 2 + margin &&
            position.x <= this.mapWidth / 2 - margin &&
            position.y >= -this.mapHeight / 2 + margin &&
            position.y <= this.mapHeight / 2 - margin;
    }

    /**
     * 獲取預設生成配置
     */
    public static getDefaultSpawnConfig(enemyCount: number, isBossWave: boolean = false): SpawnConfig {
        if (isBossWave) {
            return {
                type: SpawnType.BOSS_CENTER,
                count: enemyCount,
                minDistanceFromPlayers: 150,
                minDistanceBetweenEnemies: 100,
                maxAttempts: 20
            };
        }

        return {
            type: SpawnType.RANDOM_EDGE,
            count: enemyCount,
            minDistanceFromPlayers: 120,
            minDistanceBetweenEnemies: 60,
            maxAttempts: 50
        };
    }

    /**
     * 更新地圖大小
     */
    public updateMapSize(width: number, height: number): void {
        this.mapWidth = width;
        this.mapHeight = height;
    }

}
