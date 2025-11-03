import { ArraySchema, Schema, type } from "@colyseus/schema";
import { Vector2 } from "./Unit/GameUnit";
import { BulletCreateConfig, StatusEffectConfig } from "@/Types";
import { PropertyValue } from "@/Types/Equipment/WeaponPropertyTypes";

// 子彈 Schema - Vampire Survivors 風格
export class ServerBullet extends Schema {
    @type("string") id: string = "";
    @type("string") ownerId: string = ""; // 發射者ID

    @type("number") speed: number = 200; // 移動速度 (像素/秒)
    // @type("number")

    // 發射時的初始資訊
    @type('number') startPositionX: number = 0; // 發射起點
    @type('number') startPositionY: number = 0; // 發射起點
    @type("number") directionX: number = 0; // 發射方向 (單位向量)
    @type("number") directionY: number = 0 // 發射方向 (單位向量)
    @type("number") startTime: number = 0; // 發射時間戳

    @type("string") weaponId: string = ""; // 發射武器的ID (用於獲取武器屬性)

    damage: number = 0; // 傷害
    maxDistance: number = 400; // 最大飛行距離 (像素)

    // 🆕 狀態效果配置 (不同步到客戶端,僅伺服器使用)
    statusEffects: StatusEffectConfig[] = [];
    properties: Record<string, PropertyValue> = {};
    pierceCount: number;

    // 🆕 標籤信息 (Phase 3: 從 BulletCreateConfig 攜帶過來)
    @type(["string"]) tags = new ArraySchema<string>();           // 武器標籤
    @type(["string"]) elementTags = new ArraySchema<string>();    // 元素標籤
    modifiers: any[] = [];         // 武器詞綴

    /**
     * 🆕 獲取範圍傷害半徑（使用屬性ID）
     */
    public get areaOfEffect(): number {
        const aoeProp = this.properties['area_of_effect'];
        return aoeProp ? aoeProp.value : 0;
    }


    // 設置發射參數
    initialize(
        id: string,
        ownerId: string,
        startPos: Vector2,
        targetDir: Vector2,
        damage: number,
        speed: number = 200,

        weaponId: string = "",
        maxDistance: number = 400
    ): void {
        this.id = id;
        this.ownerId = ownerId;
        this.weaponId = weaponId;
        this.startPositionX = startPos.x;
        this.startPositionY = startPos.y;
        this.directionX = targetDir.x;
        this.directionY = targetDir.y;
        this.damage = damage;
        this.speed = speed;

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
        const currentX = this.startPositionX + (this.directionX * traveledDistance);
        const currentY = this.startPositionY + (this.directionY * traveledDistance);
        return new Vector2(currentX, currentY);
    }

    /**
     * 🆕 應用擴展配置（POE風格）
     * 
     * @param config 子彈創建配置
     */
    public applyExtendedConfig(config: BulletCreateConfig): void {
        // 應用屬性配置
        this.properties = config.properties;

        // 🆕 處理穿透次數（使用屬性ID）
        const pierceProp = config.properties['pierce_count'];
        this.pierceCount = pierceProp ? pierceProp.value : 1;

        // ✅ 處理狀態效果配置（燃燒、中毒等）
        if (config.statusEffects) {
            this.statusEffects = config.statusEffects;
            //console.log(`💊 [Bullet] 應用 ${config.statusEffects.length} 個狀態效果:`, config.statusEffects);
        }

        // 🆕 Phase 3: 接收標籤信息（避免回查武器）
        if (config.tags) {
            this.tags.push(...config.tags);
        }
        if (config.elementTags) {
            this.elementTags.push(...config.elementTags);
        }
        if (config.modifiers) {
            this.modifiers = config.modifiers;
        }
    }
}
