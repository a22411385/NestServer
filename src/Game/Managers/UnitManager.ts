import { IdGenerator } from "@/Util/IdGenerator";

import { ServerEnemy } from "../../Colyseus/Schema/Unit/Enemy";
import { Client, Room } from "colyseus";
import { GameRoomState, UnitType } from "../../Colyseus/Schema/GameState";
import { ServerGameUnit, Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { ServerHero, StatType } from "../../Colyseus/Schema/Unit/Hero";
import { MapSchema } from "@colyseus/schema";

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
        * 生成殭屍到 enemies，數量不超過最大上限
        */
    public spawnZombies(): void {
        const currentCount = this.room.state.getEnemyCount();
        const canSpawn = Math.max(0, MAX_ENEMY_COUNT - currentCount);
        const spawnCount = Math.min(1, canSpawn);

        if (spawnCount <= 0) {
            console.warn("無法生成更多殭屍，已達上限");
            return;
        }
        let spawnedCount = 0;
        for (let i = 0; i < spawnCount; i++) {
            // 隨機決定殭屍類型
            const randomType = Math.floor(Math.random() * 3) + 1;

            const enemy = new ServerEnemy();
            // 🔧 使用統一的ID生成系統
            enemy.id = IdGenerator.generateEnemyId(randomType);
            enemy.initializeByType(randomType);

            let position = new Vector2(0, 0);
            // 隨機在地圖邊緣生成
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
                case 0: // 上
                    position.x = Math.random() * this.mapWidth;
                    position.y = 0;
                    break;
                case 1: // 下
                    position.x = Math.random() * this.mapWidth;
                    position.y = this.mapHeight;
                    break;
                case 2: // 左
                    position.x = 0;
                    position.y = Math.random() * this.mapHeight;
                    break;
                case 3: // 右
                    position.x = this.mapWidth;
                    position.y = Math.random() * this.mapHeight;
                    break;
            }
            enemy.position = position;
            //名稱先寫死
            enemy.name = ZombieName[randomType - 1];
            // console.log('生成殭屍', enemy.id, '類型:', randomType, '位置:', position);
            // 使用新的添加方法
            this.room.state.addEnemy(enemy);
            spawnedCount++;
        }
    }

    /**
     * 獲取所有存活的敵人
     * 用於自動攻擊系統
     */
    public getAllAliveEnemies(): ServerEnemy[] {
        const aliveEnemies: ServerEnemy[] = [];

        for (const [, unit] of this.room.state.gameCore.allUnits) {
            if (unit.type === UnitType.enemy && !unit.isDead) {
                aliveEnemies.push(unit as ServerEnemy);
            }
        }

        return aliveEnemies;
    }

    /**
     * 獲取所有存活的英雄
     */
    public getAllAliveHeroes() {
        const aliveHeroes = [];

        for (const [, unit] of this.room.state.gameCore.allUnits) {
            if (unit.type === UnitType.hero && !unit.isDead) {
                aliveHeroes.push(unit);
            }
        }

        return aliveHeroes;
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

    /**
     * 獲取屬性顯示名稱
     */
    private getStatDisplayName(stat: string): string {
        const statNames = {
            'vitality': '體質',
            'strength': '力量',
            'agility': '敏捷',
            'intelligence': '智慧'
        };
        return statNames[stat as keyof typeof statNames] || stat;
    }
}