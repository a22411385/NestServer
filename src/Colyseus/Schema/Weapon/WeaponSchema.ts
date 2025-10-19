import { Schema, type, ArraySchema } from "@colyseus/schema";
import { WeaponType } from "../../../Types";
import { UniqueIdGenerator } from "../../../Util/UniqueIdGenerator";
import { WeaponConfigManager } from "@/Game/Factories/WeaponConfig";
import { PropertyValue } from "@/Types/Equipment/WeaponPropertyTypes";
import { WeaponBasic } from "./Baisc/WeaponBasic";

/**
 * 武器 Schema 類 - 同步武器狀態到客戶端
 * 
 * 🎯 設計理念:
 * - 繼承 Schema,所有屬性同步到客戶端
 * - 客戶端可直接訪問武器數據 (名稱、等級、屬性等)
 * - 通過 getLogicInstance() 獲取服務器端戰鬥邏輯實例
 * 
 * 📦 數據流向:
 * WeaponSchema (同步數據) → WeaponBasic (戰鬥邏輯)
 * 
 * @example
 * // 服務器端 - 戰鬥邏輯
 * const weaponLogic = weaponSchema.getLogicInstance();
 * const result = weaponLogic.tryAttack(hero, enemies);
 * 
 * // 客戶端 - 直接訪問數據
 * console.log(weaponSchema.name, weaponSchema.level, weaponSchema.quality);
 */
export class WeaponSchema extends Schema {
    // === 唯一識別 ===
    @type("string") uniqueId: string = "";              // 武器唯一識別碼

    // === 基本信息 ===
    @type("string") weaponId: string = "";              // 武器類型ID
    @type("string") weaponType: string = "";            // 武器類型
    @type("string") name: string = "";                  // 武器英文名

    @type("string") description: string = "";           // 武器描述
    @type("string") rarity: string = "common";          // 稀有度

    // === 玩家培養數據 ===
    @type("number") level: number = 1;                  // 武器等級
    @type("number") exp: number = 0;                    // 當前經驗
    @type("number") enhanceLevel: number = 0;           // 強化等級
    @type("number") durability: number = 100;           // 耐久度
    @type("boolean") isEquipped: boolean = false;       // 是否裝備中

    // === 獲得信息 ===
    @type("number") obtainedAt: number = 0;             // 獲得時間（用於排序）

    // === 🆕 動態屬性系統 ===
    @type("string") quality: string = "normal";         // 武器品質 (normal, magic, rare, epic, legendary)
    @type(["string"]) fixedProperties: ArraySchema<string> = new ArraySchema<string>();    // 固定屬性列表 (同步到客戶端)
    @type(["string"]) randomProperties: ArraySchema<string> = new ArraySchema<string>();   // 隨機屬性列表 (同步到客戶端)

    // 屬性值存儲 (JSON 字串形式同步到客戶端)
    @type("string") propertiesJson: string = "{}";      // 所有屬性的 JSON 表示

    // === 🆕 邏輯實例緩存 (不同步到客戶端) ===
    private _logicInstance: WeaponBasic | null = null;

    constructor(weaponId: string = "") {
        super();
        this.weaponId = weaponId;
        this.uniqueId = UniqueIdGenerator.generateWeaponId();
        this.obtainedAt = Date.now();
        const allConfigs = WeaponConfigManager.getInstance().getAllConfigs();
        // 從武器配置載入顯示資訊
        const config = allConfigs[weaponId];
        if (config) {
            this.name = config.name;
            this.description = config.description || "";
            // rarity 不存在於配置中，使用默認值
            this.weaponType = config.type || this.inferWeaponType(weaponId);

            // 🆕 初始化屬性列表
            if (config.fixedProperties) {
                const fixedProps = config.fixedProperties.split(',').map((p: string) => p.trim()).filter((p: string) => p);
                this.fixedProperties.push(...fixedProps);
            }

            if (config.randomProperties) {
                const randomProps = config.randomProperties.split(',').map((p: string) => p.trim()).filter((p: string) => p);
                this.randomProperties.push(...randomProps);
            }
        } else {
            this.weaponType = this.inferWeaponType(weaponId);
        }
    }

    /**
     * 簡單的武器類型推斷（最小邏輯）
     */
    private inferWeaponType(weaponId: string): WeaponType {
        if (weaponId.includes('bow') || weaponId.includes('gun') || weaponId.includes('ball')) {
            return WeaponType.PROJECTILE_WEAPON;
        } else if (weaponId.includes('sword') || weaponId.includes('bat') || weaponId.includes('knife')) {
            return WeaponType.MELEE_WEAPON;
        } else if (weaponId.includes('heal') || weaponId.includes('buff') || weaponId.includes('staff') || weaponId.includes('wand')) {
            return WeaponType.SUPPORT_WEAPON;
        }
        return WeaponType.MELEE_WEAPON; // 默認近戰
    }

    // === 🆕 屬性管理方法 ===

    /**
     * 設置武器屬性（從 PropertyValue[] 轉換為 JSON 同步到客戶端）
     */
    public setProperties(properties: PropertyValue[]): void {
        const propertiesObj: { [key: string]: any } = {};
        for (const prop of properties) {
            propertiesObj[prop.type] = prop.value;
        }
        this.propertiesJson = JSON.stringify(propertiesObj);
    }

    /**
     * 獲取武器屬性（從 JSON 轉換為 PropertyValue[]）
     */
    public getProperties(): PropertyValue[] {
        if (!this.propertiesJson || this.propertiesJson === "{}") {
            return [];
        }

        try {
            const propertiesObj = JSON.parse(this.propertiesJson);
            const properties: PropertyValue[] = [];

            for (const [type, value] of Object.entries(propertiesObj)) {
                properties.push({
                    type: type as any,
                    value: value as any
                });
            }

            return properties;
        } catch (error) {
            console.warn(`解析武器屬性失敗 ${this.weaponId}:`, error);
            return [];
        }
    }

    /**
     * 獲取特定屬性值
     */
    public getPropertyValue(type: string): number | number[] | null {
        const properties = this.getProperties();
        const property = properties.find(p => p.type === type);
        return property ? property.value : null;
    }

    /**
     * 檢查是否有特定屬性
     */
    public hasProperty(type: string): boolean {
        return this.getPropertyValue(type) !== null;
    }

    // === 🆕 邏輯實例管理 ===

    /**
     * 獲取武器邏輯實例 (懶加載)
     * 
     * 用於服務器端戰鬥邏輯處理
     * 
     * @returns WeaponBasic 實例,如果創建失敗則返回 null
     * 
     * @example
     * const weaponLogic = weaponSchema.getLogicInstance();
     * if (weaponLogic) {
     *     const result = weaponLogic.tryAttack(hero, enemies);
     * }
     */
    public getLogicInstance(): WeaponBasic | null {
        if (!this._logicInstance) {
            // 延遲導入避免循環依賴
            const { WeaponInstanceManager } = require('@/Game/Managers/WeaponInstanceManager');
            this._logicInstance = WeaponInstanceManager.getOrCreateInstance(this);
        }
        return this._logicInstance;
    }

    /**
     * 清除邏輯實例緩存
     * 
     * 當武器屬性變更時應該調用此方法,以確保下次獲取時重新創建實例
     * 
     * @example
     * weaponSchema.level++;
     * weaponSchema.invalidateLogicInstance(); // 清除緩存,下次獲取時會重新創建
     */
    public invalidateLogicInstance(): void {
        if (this._logicInstance) {
            // 延遲導入避免循環依賴
            const { WeaponInstanceManager } = require('@/Game/Managers/WeaponInstanceManager');
            WeaponInstanceManager.invalidateCache(this);
            this._logicInstance = null;
        }
    }
}

// 🆕 類型別名 - 向下兼容
export type WeaponData = WeaponSchema;
