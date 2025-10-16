import { Schema, type } from "@colyseus/schema";
import { Vector2 } from "./Unit/GameUnit";

// 子彈 Schema - Vampire Survivors 風格
export class ServerBullet extends Schema {
    @type("string") id: string = "";
    @type("string") ownerId: string = ""; // 發射者ID

    @type("number") speed: number = 200; // 移動速度 (像素/秒)
    // @type("number")

    // 發射時的初始資訊
    @type(Vector2) startPosition: Vector2 = new Vector2(0, 0); // 發射起點
    @type(Vector2) direction: Vector2 = new Vector2(1, 0); // 發射方向 (單位向量)
    @type("number") startTime: number = 0; // 發射時間戳

    // 子彈類型相關
    @type("string") bulletType: string = "basic"; // 子彈類型: basic, piercing, explosive
    @type("string") weaponId: string = ""; // 發射武器的ID (用於獲取武器屬性)


    damage: number = 0; // 傷害
    pierceCount: number = 1; // 穿透次數 (對於穿透彈)
    maxDistance: number = 400; // 最大飛行距離 (像素)

    // 設置發射參數
    initialize(
        id: string,
        ownerId: string,
        startPos: Vector2,
        targetDir: Vector2,
        damage: number,
        speed: number = 200,
        bulletType: string,
        weaponId: string = "",
        maxDistance: number = 400
    ): void {
        this.id = id;
        this.ownerId = ownerId;
        this.weaponId = weaponId;
        this.startPosition.x = startPos.x;
        this.startPosition.y = startPos.y;
        this.direction.x = targetDir.x;
        this.direction.y = targetDir.y;
        this.damage = damage;
        this.speed = speed;
        this.bulletType = bulletType;
        this.maxDistance = maxDistance;
        this.startTime = Date.now();

        // 根據子彈類型設置屬性
        switch (bulletType) {
            case "piercing":
                this.pierceCount = 3;
                this.maxDistance = maxDistance * 1.2; // 穿透彈飛得更遠
                break;
            case "explosive":
                this.maxDistance = maxDistance * 0.8; // 爆炸彈飛得較近
                this.speed = speed * 0.8;
                break;
            default: // basic
                this.pierceCount = 1;
                break;
        }
    }

    // 計算已飛行的距離 (用於測試和調試)
    public getTraveledDistance(): number {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.startTime) / 1000; // 轉為秒
        return this.speed * elapsedTime;
    }

    // 檢查子彈是否應該被移除
    shouldDestroy(): boolean {
        // 基於飛行距離判斷
        const traveledDistance = this.getTraveledDistance();
        const exceedsDistance = traveledDistance >= this.maxDistance;

        // 穿透次數用完
        const pierceUsedUp = this.pierceCount <= 0;

        return exceedsDistance || pierceUsedUp;
    }

    // 計算當前位置 (用於伺服器端碰撞檢測)
    getCurrentPosition(): Vector2 {
        const traveledDistance = Math.min(this.getTraveledDistance(), this.maxDistance);

        const currentX = this.startPosition.x + (this.direction.x * traveledDistance);
        const currentY = this.startPosition.y + (this.direction.y * traveledDistance);

        return new Vector2(currentX, currentY);
    }

    // 處理命中 - 簡化版本，只負責基本狀態管理
    onHit(): boolean {
        this.pierceCount--;

        // 返回是否應該繼續存在
        return this.pierceCount > 0;
    }
}
