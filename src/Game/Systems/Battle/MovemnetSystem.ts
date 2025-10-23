import { GameRoom } from "../../../Colyseus/Rooms/GameRoom";
import { ServerGameUnit } from "../../../Colyseus/Schema/Unit/GameUnit";
import { Client } from "colyseus";
import { BattleMathUtils } from "../../../Util/BattleMathUtils";


const MOVEMENT_CONFIG = {
    MOVEMENT_SCALE: 3,        // 移動縮放係數，與客戶端保持一致
    FIXED_DELTA: 1 / 60        // 固定 delta time (60 FPS)
};

/**
 * 移動系統 - 負責處理所有單位的移動邏輯
 */
export class MovementSystem {

    private room: GameRoom;

    get getAllUnits(): Map<string, ServerGameUnit> {
        return this.room.state.allUnits;
    }

    constructor(room: GameRoom) {
        this.room = room;
    }

    /**
     * 獲取所有單位的位置（用於強制同步）
     */
    public getAllUnitPositions(): Record<string, { x: number, y: number }> {
        const positions: Record<string, { x: number, y: number }> = {};

        // 收集所有單位位置
        for (const [unitId, unit] of this.getAllUnits) {
            if (!unit.isDead) {
                positions[unit.id] = { x: unit.position.x, y: unit.position.y };
            }
        }

        return positions;
    }

    /**
     * 🔧 修改移動邏輯，讓所有單位都由統一系統處理
     */
    public MoveAllUnit(): void {
        for (const [unitId, unit] of this.getAllUnits) {
            // 🎯 跳過速度為0的單位
            if (unit.vx == 0 && unit.vy == 0) {
                continue;
            }

            // 🎯 移動所有有速度的單位（包含玩家和敵人）
            this.MoveUnit(unit);
        }
    }
    private MoveUnit(unit: ServerGameUnit): void {
        // 獲取單位速度
        const speed = unit.moveSpeed;

        // 使用與客戶端相同的移動計算公式
        const moveDistance = speed * MOVEMENT_CONFIG.FIXED_DELTA * MOVEMENT_CONFIG.MOVEMENT_SCALE;
        const deltaX = unit.vx * moveDistance;
        const deltaY = unit.vy * moveDistance;

        // 更新面向角度（如果單位正在移動）
        if (unit.vx !== 0 || unit.vy !== 0) {
            unit.facingDirection = Math.atan2(unit.vy, unit.vx);
        }

        unit.position.x += deltaX;
        unit.position.y += deltaY;

        // 確保在世界邊界內
        const clampedPosition = BattleMathUtils.clampToMapBounds(unit.position, this.room.mapWidth, this.room.mapHeight);
        unit.position.x = clampedPosition.x;
        unit.position.y = clampedPosition.y;
    }
    /**
     * 設定玩家移動向量
     */
    handlePlayerMoveVector(client: Client, vx: number, vy: number): void {
        const hero = this.room.state.getHero(client.sessionId);

        if (hero) {
            hero.vx = vx;
            hero.vy = vy;
        }
    }
}
