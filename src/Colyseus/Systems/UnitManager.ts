import { IdGenerator } from "@/Util/IdGenerator";

import { Enemy } from "../Schema/Unit/Enemy";
import { Room } from "colyseus";
import { GameRoomState } from "../Schema/GameState";
import { Vector2 } from "../Schema/Unit/GameUnit";

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

            const enemy = new Enemy();
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
            console.log('生成殭屍', enemy.id, '類型:', randomType, '位置:', position);
            // 使用新的添加方法
            this.room.state.addEnemy(enemy);
            spawnedCount++;
        }
    }

}