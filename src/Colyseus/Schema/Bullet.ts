import { Schema, type } from "@colyseus/schema";
import { Vector2 } from "./Unit/GameUnit";
import { BulletCreateConfig, StatusEffectConfig } from "@/Types";
import { PropertyType, PropertyValue } from "@/Types/Equipment/WeaponPropertyTypes";

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
    maxDistance: number = 400; // 最大飛行距離 (像素)

    // 🆕 狀態效果配置 (不同步到客戶端,僅伺服器使用)
    statusEffects: StatusEffectConfig[] = [];
    properties: Record<string, PropertyValue> = {};
    pierceCount: number;

    public get areaOfEffect(): number {
        let aoe = this.properties[PropertyType.AREA_OF_EFFECT]?.value;
        if (Array.isArray(aoe)) {
            return (aoe[0] || 0);
        }
        return (aoe || 0);
    }


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
     * 應用擴展配置
     * 
     * @param config 子彈創建配置
     */
    public applyExtendedConfig(config: BulletCreateConfig): void {
        // 應用屬性配置
        this.properties = config.properties;

        // 處理穿透次數
        let pCount = config.properties[PropertyType.PIERCE_COUNT]?.value;
        this.pierceCount = Array.isArray(pCount) ? pCount[0] || 1 : pCount || 1;

        // ✅ 處理狀態效果配置（燃燒、中毒等）
        if (config.statusEffects) {
            this.statusEffects = config.statusEffects;
            //console.log(`💊 [Bullet] 應用 ${config.statusEffects.length} 個狀態效果:`, config.statusEffects);
        }
    }
}
