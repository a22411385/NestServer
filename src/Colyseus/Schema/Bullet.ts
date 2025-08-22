import { Schema, type } from "@colyseus/schema";
import { Vector2 } from "./Unit/GameUnit";

// 子彈 Schema - Vampire Survivors 風格
export class ServerBullet extends Schema {
    @type("string") id: string = "";
    @type("string") ownerId: string = ""; // 發射者ID
    @type("number") damage: number = 0; // 傷害
    @type("number") speed: number = 200; // 移動速度 (像素/秒)
    @type("number") lifetime: number = 3000; // 生存時間 (毫秒)
    @type("number") range: number = 400; // 最大射程

    // 發射時的初始資訊
    @type(Vector2) startPosition: Vector2 = new Vector2(0, 0); // 發射起點
    @type(Vector2) direction: Vector2 = new Vector2(1, 0); // 發射方向 (單位向量)
    @type("number") startTime: number = 0; // 發射時間戳

    // 子彈類型相關
    @type("string") bulletType: string = "basic"; // 子彈類型: basic, piercing, explosive
    @type("number") pierceCount: number = 1; // 穿透次數 (對於穿透彈)
    @type("boolean") hasHit: boolean = false; // 是否已命中目標


    // 設置發射參數
    initialize(
        id: string,
        ownerId: string,
        startPos: Vector2,
        targetDir: Vector2,
        damage: number,
        speed: number = 200,
        bulletType: string = "basic"
    ): void {
        this.id = id;
        this.ownerId = ownerId;
        this.startPosition.x = startPos.x;
        this.startPosition.y = startPos.y;
        this.direction.x = targetDir.x;
        this.direction.y = targetDir.y;
        this.damage = damage;
        this.speed = speed;
        this.bulletType = bulletType;
        this.startTime = Date.now();

        // 根據子彈類型設置屬性
        switch (bulletType) {
            case "piercing":
                this.pierceCount = 3;
                break;
            case "explosive":
                this.range = 300;
                this.speed = 150;
                break;
            default: // basic
                this.pierceCount = 1;
                break;
        }
    }

    // 檢查子彈是否應該被移除
    shouldDestroy(): boolean {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.startTime;

        return elapsedTime >= this.lifetime ||
            (this.hasHit && this.pierceCount <= 0);
    }

    // 計算當前位置 (用於伺服器端碰撞檢測)
    getCurrentPosition(): Vector2 {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.startTime) / 1000; // 轉為秒

        const currentX = this.startPosition.x + (this.direction.x * this.speed * elapsedTime);
        const currentY = this.startPosition.y + (this.direction.y * this.speed * elapsedTime);

        return new Vector2(currentX, currentY);
    }

    // 處理命中
    onHit(): boolean {
        this.hasHit = true;
        this.pierceCount--;

        // 返回是否應該繼續存在
        return this.pierceCount > 0;
    }
}
