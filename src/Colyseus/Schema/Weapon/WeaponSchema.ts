import { Schema, type, ArraySchema } from "@colyseus/schema";
import { WeaponType } from "../../../Types";
import { UniqueIdGenerator } from "../../../Util/UniqueIdGenerator";
import { WeaponConfigManager } from "@/Game/Factories/WeaponConfig";
import { PropertyType, PropertyValue, WeaponConfigDefinition } from "@/Types/Equipment/WeaponPropertyTypes";
import { WeaponBasic } from "./Baisc/WeaponBasic";
import { WeaponInstanceManager } from "@/Game/Managers/WeaponInstanceManager";

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
export type WeaponPropertiesType = { fixed: PropertyValue[], random: PropertyValue[] }
export class WeaponSchema extends Schema {

    classModule: string = ''; // 武器類型模塊
    public projectileClass: string = ''; // 投射物類型

    @type("number")
    public baseDamage: number = 0; // 基礎傷害
    @type("number")
    public attackSpeed: number = 0; // 攻擊間隔 (毫秒)
    @type("number")
    public attackRange: number = 0; // 攻擊範圍 (像素)

    // 傳統屬性加成 (保留向下兼容性，但會被新屬性系統覆寫)
    @type("number")
    public int: number = 0;
    @type("number")
    public agi: number = 0;
    @type("number")
    public str: number = 0;
    @type("number")
    public vit: number = 0;

    public enabled: boolean = true;


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
    // 屬性值存儲 (JSON 字串形式同步到客戶端)
    @type("string") propertiesJson: string = "{}";      // 所有屬性的 JSON 表示


    fixedProperties: ArraySchema<string> = new ArraySchema<string>();    // 固定屬性列表 (同步到客戶端)
    randomProperties: ArraySchema<string> = new ArraySchema<string>();   // 隨機屬性列表 (同步到客戶端)

    // === 🆕 邏輯實例緩存 (不同步到客戶端) ===
    private _logicInstance: WeaponBasic | null = null;

    constructor(weaponId: string, classModule: string) {
        super();
        this.weaponId = weaponId;
        this.uniqueId = UniqueIdGenerator.generateWeaponId();
        this.classModule = classModule;
        this.obtainedAt = Date.now();
        const allConfigs = WeaponConfigManager.getInstance().getAllConfigs();
        // 從武器配置載入顯示資訊
        const config = allConfigs[weaponId];
        if (config) {
            this.name = config.name;
            this.description = config.description || "";
            // rarity 不存在於配置中，使用默認值
            this.weaponType = config.type || this.inferWeaponType();

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
            throw new Error(`WeaponConfig not found for weaponId: ${weaponId}`);
        }
    }

    /**
     * 武器設定上也有基本的數值
     * @param config 
     */
    public weaponBasicDataSetting(config: WeaponConfigDefinition) {
        this.baseDamage = config.baseDamage;
        this.attackSpeed = config.attackSpeed;
        this.enabled = config.enabled;
        this.projectileClass = config.projectileClass;
    }

    /**
     * 簡單的武器類型推斷（最小邏輯）
     */
    private inferWeaponType(): WeaponType {
        switch (this.classModule) {
            case "ProjectileWeapon":
                return WeaponType.PROJECTILE_WEAPON;
            case "MeleeWeapon":
                return WeaponType.MELEE_WEAPON;
            case "SupportWeapon":
                return WeaponType.SUPPORT_WEAPON;
            default:
                throw new Error('unknown weapon type');
        }

    }

    /**
     * ✅ 應用屬性到武器實例 - 同步到 WeaponSchema
     */

    public applyProperties(properties: WeaponPropertiesType): void {
        // ✅ 同步到 WeaponSchema（唯一數據源）
        this.setProperties(properties);

        // 更新基礎屬性（影響戰鬥邏輯）
        for (const property of [...properties.fixed, ...properties.random]) {
            this.updateBaseStats(property);
        }

        // console.log(`🔧 ${this.weaponId} 應用了 ${properties.length} 個屬性`);
    }

    /**
     * 更新基礎屬性
     */
    private updateBaseStats(property: PropertyValue): void {
        switch (property.type) {
            // 基礎武器屬性
            case PropertyType.ATTACK_DAMAGE:
                this.baseDamage +=
                    typeof property.value === 'number'
                        ? property.value
                        : property.value[0];
                break;
            case PropertyType.ATTACK_SPEED:
                // 攻擊速度是減少間隔時間，所以是減法
                const speedBonus =
                    typeof property.value === 'number'
                        ? property.value
                        : property.value[0];
                this.attackSpeed = Math.max(100, this.attackSpeed - speedBonus); // 最小間隔100ms
                break;
            case PropertyType.ATTACK_RANGE:
                this.attackRange +=
                    typeof property.value === 'number'
                        ? property.value
                        : property.value[0];
                break;

            // 角色屬性加成 (保持向下兼容)
            case PropertyType.STRENGTH:
                this.str +=
                    typeof property.value === 'number'
                        ? property.value
                        : property.value[0];
                break;
            case PropertyType.INTELLIGENCE:
                this.int +=
                    typeof property.value === 'number'
                        ? property.value
                        : property.value[0];
                break;
            case PropertyType.VITALITY:
                this.vit +=
                    typeof property.value === 'number'
                        ? property.value
                        : property.value[0];
                break;
            case PropertyType.AGILITY:
                this.agi +=
                    typeof property.value === 'number'
                        ? property.value
                        : property.value[0];
                break;


            case PropertyType.PROJECTILE_SPEED:
            case PropertyType.AREA_OF_EFFECT:
            case PropertyType.PIERCE_COUNT:
            case PropertyType.SWEEP_ANGLE:

            case PropertyType.HEAL_AMOUNT:
            case PropertyType.BUFF_DURATION:
            case PropertyType.SUPPORT_RADIUS:

            case PropertyType.KNOCKBACK:
            case PropertyType.CRITICAL_CHANCE:
            case PropertyType.CRITICAL_DAMAGE:
            case PropertyType.LIFE_STEAL:
            case PropertyType.PIERCING:
            case PropertyType.CHAIN_ATTACK:
            case PropertyType.SPLASH_DAMAGE:

            case PropertyType.STUN:
            case PropertyType.FREEZE:
            case PropertyType.BURN:
            case PropertyType.POISON:
            case PropertyType.SLOW:

                break;

            default:
                console.log(`🔧 未處理的屬性類型: ${property.type}`);
                break;
        }
    }

    /**
     * 設置武器屬性（從 PropertyValue[] 轉換為 JSON 同步到客戶端）
     */
    public setProperties(data: { fixed: PropertyValue[], random: PropertyValue[] }): void {
        // const propertiesObj: { [key: string]: any } = {};
        // for (const prop of data.fixed) {
        //     propertiesObj[prop.type] = prop.value;
        // }

        this.propertiesJson = JSON.stringify(data);
    }

    /**
     * 獲取武器屬性（從 JSON 轉換為 PropertyValue[]）
     */
    public getProperties(): WeaponPropertiesType {
        if (!this.propertiesJson || this.propertiesJson === "{}") {
            return { fixed: [], random: [] };
        }

        try {
            const propertiesObj = JSON.parse(this.propertiesJson) as WeaponPropertiesType;
            //const properties: WeaponPropertiesType = { fixed: [], random: [] };
            return propertiesObj;
        } catch (error) {
            console.warn(`解析武器屬性失敗 ${this.weaponId}:`, error);
            throw error;
        }
    }

    /**
     * 獲取特定屬性值
     */
    public getPropertyValue(type: string): PropertyValue[] {
        const properties = this.getProperties();
        const allProperties = [...properties.fixed, ...properties.random];


        const property = allProperties.filter(prop => prop.type === type);
        return property.length > 0 ? property : [];
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
