import { UnitType } from "@/Colyseus/Schema/GameState";
import { GameManager } from "../Managers/GameManager";
import { GameRoom } from "../Rooms/GameRoom";
import { GameUnit } from "../Schema/Unit/GameUnit";
import { Vector2 } from "@/Shared/BattleMathUtils";
import { Client } from "colyseus";


const MOVEMENT_CONFIG = {
    MOVEMENT_SCALE: 5,        // 移動縮放係數，與客戶端保持一致
    FIXED_DELTA: 1 / 60        // 固定 delta time (60 FPS)
};

/**
 * 移動系統 - 負責處理所有單位的移動邏輯
 */
export class MovementSystem {

    private room: GameRoom;

    get getAllUnits(): Map<string, GameUnit> {
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
                positions[unit.id] = { x: unit.x, y: unit.y };
            }
        }

        return positions;
    }

    /**
     * 強制同步所有座標
     */
    public forceUpdateAllPositions() {
        const allPositions = this.getAllUnitPositions();
        this.room.broadcast('syncPosition', allPositions);
    }

    /**
     * 🔧 獲取單位移動速度（從服務端狀態）
     */
    private getUnitSpeed(unitId: string): number {
        // 檢查所有單位

        let unit = this.room.state.allUnits.get(unitId);
        if (unit)
            return unit.speed || (unit.type === UnitType.hero ? 5 : 3);

        return 1; // 預設速度
    }

    /**
     * 🎯 應用移動到服務端單位 - 與客戶端邏輯完全一致
     */
    public MoveAllUnit(): void {

        for (const [unitId, unit] of this.getAllUnits) {

            if (unit.vx == 0 && unit.vy == 0) {
                continue;
            }
            // 獲取單位速度
            const speed = this.getUnitSpeed(unitId);

            // 使用與客戶端相同的移動計算公式
            const moveDistance = speed * MOVEMENT_CONFIG.FIXED_DELTA * MOVEMENT_CONFIG.MOVEMENT_SCALE;
            const deltaX = unit.vx * moveDistance;
            const deltaY = unit.vy * moveDistance;

            unit.x += deltaX;
            unit.y += deltaY;

            // 確保在世界邊界內
            unit.x = Math.max(-500, Math.min(500, unit.x));
            unit.y = Math.max(-500, Math.min(500, unit.y));

        }
    }
    addMoveData(unitId: string, moveVector: Vector2): void {

        const unit = this.room.state.allUnits.get(unitId);
        if (unit) {
            unit.vx = moveVector.x;
            unit.vy = moveVector.y;
        }
    }

    /**
     * 處理玩家移動向量
     */
    handlePlayerMoveVector(client: Client, vx: number, vy: number): void {
        const hero = this.room.state.getHero(client.sessionId);

        if (hero) {
            // 設置移動向量
            if (hero.vx != vx || hero.vy != vy) {
                this.addMoveData(hero.id, { x: vx, y: vy });
            }
        }
    }

}