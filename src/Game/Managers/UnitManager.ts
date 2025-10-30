import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { Client, Room } from "colyseus";
import { GameRoomState, UnitType } from "../../Colyseus/Schema/GameState";
import { ServerGameUnit } from "@/Colyseus/Schema/Unit/GameUnit";
import { StatType } from "@/Types/Game/GameTypes";
import { ServerHero } from "@/Colyseus/Schema/Unit/Hero";

const MAX_ENEMY_COUNT = 100;
const ZombieName = ["普通殭屍", "快速殭屍", "強壯殭屍"];

export class UnitManager {
    private mapWidth: number;
    private mapHeight: number;
    private room: Room<GameRoomState>;

    constructor(room: Room<GameRoomState>) {

        this.room = room;
        this.mapWidth = room.state.mapData.width;
        this.mapHeight = room.state.mapData.height;
    }

    /**
     * 獲取所有存活的敵人
     * 用於自動攻擊系統
     */
    public getAllAliveEnemies(): ServerEnemy[] {
        const aliveEnemies: ServerEnemy[] = [];

        for (const [, unit] of this.room.state.allUnits) {
            if (unit.type === UnitType.enemy && !unit.isDead) {
                aliveEnemies.push(unit as ServerEnemy);
            }
        }

        return aliveEnemies;
    }

    /**
     * 獲取所有存活的英雄
     */
    public getAllAliveHeroes(): ServerHero[] {
        const aliveHeroes = [];

        for (const [, unit] of this.room.state.allUnits) {
            if (unit.type === UnitType.hero && !unit.isDead) {
                aliveHeroes.push(unit as ServerHero);
            }
        }

        return aliveHeroes;
    }

    public getUnitById(unitId: string): ServerGameUnit | undefined {
        return this.room.state.allUnits.get(unitId);
    }
    /**
    * 處理屬性點分配
    */
    public handleStatAllocation(client: Client, message: { stat: StatType, points: number }) {
        // 驗證玩家
        const player = this.room.state.players.get(client.sessionId);
        if (!player) {
            client.send("error", { message: "Player not found" });
            return;
        }

        // 獲取英雄
        const hero = this.room.state.getHero(client.sessionId);
        if (!hero) {
            client.send("error", { message: "Hero not found" });
            return;
        }

        // 驗證參數
        if (!message.stat || !['vit', 'str', 'agi', 'int'].includes(message.stat)) {
            client.send("error", { message: "Invalid stat type" });
            return;
        }

        const points = message.points || 1;
        if (points < 1) { // 限制單次分配上限
            client.send("error", { message: "Invalid points amount" });
            return;
        }

        // 執行屬性分配
        const success = hero.allocateStatPoint(message.stat, points);

        if (success) {
            // 廣播成功訊息
            console.log(`Player ${player.name} allocated ${points} points to ${message.stat}`);

            // 記錄日誌

        } else {
            client.send("error", {
                message: "Failed to allocate stat points",
                reason: "Insufficient stat points"
            });
        }
    }

    /**
     * 處理屬性重置 (可選功能)
     */
    public handleStatReset(client: Client) {

        // const hero = this.getHero(client.sessionId);
        // if (!hero) {
        //     client.send("error", { message: "Hero not found" });
        //     return;
        // }

        // 重置屬性邏輯 (需要在 Hero 中實作)
        // hero.resetStats();
    }
}