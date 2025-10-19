import { Schema, type } from "@colyseus/schema";
import { Vector2 } from "./Unit/GameUnit";
import { StatusEffectConfig } from "@/Types";

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
    areaOfEffect: number = 0; // 範圍效果半徑 (像素)
    maxDistance: number = 400; // 最大飛行距離 (像素)

    // 🆕 狀態效果配置 (不同步到客戶端,僅伺服器使用)
    statusEffects: StatusEffectConfig[] = [];

    // 🔮 未來可擴展的屬性 (暫時保留註釋作為範例)
    // bounceCount: number = 0; // 彈射次數
    // knockbackDistance: number = 0; // 擊退距離
    // homingStrength: number = 0; // 追蹤強度
    // chainCount: number = 0; // 連鎖次數

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
    }

    // 計算已飛行的距離
    public getTraveledDistance(): number {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.startTime) / 1000;
        return this.speed * elapsedTime;
    }

    // 檢查子彈是否應該被移除
    shouldDestroy(): boolean {
        const traveledDistance = this.getTraveledDistance();
        return traveledDistance >= this.maxDistance || this.pierceCount <= 0;
    }

    // 計算當前位置
    getCurrentPosition(): Vector2 {
        const traveledDistance = Math.min(this.getTraveledDistance(), this.maxDistance);
        const currentX = this.startPosition.x + (this.direction.x * traveledDistance);
        const currentY = this.startPosition.y + (this.direction.y * traveledDistance);
        return new Vector2(currentX, currentY);
    }

    /**
     * 🆕 應用擴展配置 (優雅的屬性賦值方案)
     * 
     * 🎯 解決問題：避免在 BulletFactory 中為每個新屬性添加 if 判斷
     * 
     * 📝 使用方式：
     * ```typescript
     * const bullet = new ServerBullet();
     * bullet.initialize(...);
     * bullet.applyExtendedConfig(config); // ← 自動處理所有可選屬性
     * ```
     * 
     * ✅ 優點：
     * - 新增屬性時只需在 BulletCreateConfig 中定義
     * - 自動處理所有可選屬性的賦值
     * - 類型安全 (TypeScript 會檢查屬性是否存在)
     * - 集中管理屬性列表，易於維護
     * 
     * @param config 子彈創建配置
     */
    public applyExtendedConfig(config: {
        pierceCount?: number;
        areaOfEffect?: number;
        statusEffects?: StatusEffectConfig[];
        // 🔮 未來擴展：只需在這裡和 BulletCreateConfig 添加屬性定義即可
        // bounceCount?: number;
        // knockbackDistance?: number;
        // homingStrength?: number;
        // chainCount?: number;
    }): void {
        // 🎯 優雅方案：使用屬性映射表批量處理
        const extendedProperties: Array<keyof typeof config> = [
            'pierceCount',
            'areaOfEffect',
            'statusEffects',
            // 🔮 未來擴展時在這裡添加屬性名即可
            // 'bounceCount',
            // 'knockbackDistance',
            // 'homingStrength',
            // 'chainCount',
        ];

        extendedProperties.forEach(prop => {
            if (config[prop] !== undefined) {
                // @ts-ignore - 動態賦值，類型安全已由 config 參數保證
                this[prop] = config[prop];
            }
        });
    }
}
