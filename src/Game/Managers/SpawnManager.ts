import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { ServerGameUnit } from "../../Colyseus/Schema/Unit/GameUnit";
import { BattleMathUtils } from "../../Shared/BattleMathUtils";

/**
 * 生成位置類型
 */
export enum SpawnType {
    RANDOM_EDGE = "random_edge",    // 隨機邊緣
    NORTH_EDGE = "north_edge",      // 北邊緣
    SOUTH_EDGE = "south_edge",      // 南邊緣
    EAST_EDGE = "east_edge",        // 東邊緣
    WEST_EDGE = "west_edge",        // 西邊緣
    CORNERS = "corners",            // 四個角落
    CIRCLE_FORMATION = "circle",    // 圓形陣型
    BOSS_CENTER = "boss_center"     // Boss 專用中心位置
}

/**
 * 生成位置配置
 */
export interface SpawnConfig {
    type: SpawnType;
    count: number;
    minDistanceFromPlayers: number;
    minDistanceBetweenEnemies: number;
    maxAttempts: number;
}

/**
 * 生成位置管理器 - 負責計算和驗證敵人生成位置
 */
export class SpawnManager {
    private mapWidth: number;
    private mapHeight: number;
    private safeZoneRadius: number = 200; // 玩家周圍的安全區域

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
                return this.getRandomEdgePositions(config, existingUnits);

            case SpawnType.CIRCLE_FORMATION:
                return this.getCircleFormationPositions(config, existingUnits);

            case SpawnType.CORNERS:
                return this.getCornerPositions(config, existingUnits);

            case SpawnType.BOSS_CENTER:
                return this.getBossCenterPositions(config, existingUnits);

            default:
                return this.getRandomEdgePositions(config, existingUnits);
        }
    }

    /**
     * 獲取隨機邊緣位置
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
     * 檢查位置是否有效
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

    /**
     * 設置安全區域半徑
     */
    public setSafeZoneRadius(radius: number): void {
        this.safeZoneRadius = radius;
    }
}
