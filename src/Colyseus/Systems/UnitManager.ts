import { IdGenerator } from "@/Util/IdGenerator";

import { Enemy } from "../Schema/Unit/Enemy";
import { Room } from "colyseus";
import { GameRoomState } from "../Schema/GameState";

const MAX_ENEMY_COUNT = 100;
const MAP_SIZE = 1000;

export class UnitManager {

    private room: Room<GameRoomState>;

    constructor(room: Room<GameRoomState>) {

        this.room = room;
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

            // 隨機在地圖邊緣生成
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
                case 0: // 上
                    enemy.x = Math.random() * MAP_SIZE;
                    enemy.y = 0;
                    break;
                case 1: // 下
                    enemy.x = Math.random() * MAP_SIZE;
                    enemy.y = MAP_SIZE;
                    break;
                case 2: // 左
                    enemy.x = 0;
                    enemy.y = Math.random() * MAP_SIZE;
                    break;
                case 3: // 右
                    enemy.x = MAP_SIZE;
                    enemy.y = Math.random() * MAP_SIZE;
                    break;
            }

            // 使用新的添加方法
            this.room.state.addEnemy(enemy);
            spawnedCount++;
        }
    }

}