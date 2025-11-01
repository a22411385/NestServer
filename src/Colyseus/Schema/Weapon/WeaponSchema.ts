import { Schema, type } from "@colyseus/schema";
import { WeaponType } from "../../../Types";
import { UniqueIdGenerator } from "../../../Util/UniqueIdGenerator";
import { WeaponConfigManager } from "@/Game/Factories/WeaponConfig";
import { PropertyValue, WeaponConfigDefinition, WeaponQuality } from "@/Types/Equipment/WeaponPropertyTypes";
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
    @type("string") rarity: WeaponQuality = "normal";          // 稀有度
    @type("string") craftingBranch: string = "none";    // 製作分支 (poison/frost/flame/lightning/explosive/none)
    @type("string") elementType: string = "physical";   // 🆕 武器元素類型 (physical/fire/ice/lightning/poison/holy/shadow/arcane)

    // === 玩家培養數據 ===
    @type("number") level: number = 1;                  // 武器等級
    @type("number") exp: number = 0;                    // 當前經驗

    @type("boolean") isEquipped: boolean = false;       // 是否裝備中

    fixedProperties: PropertyValue[] = [];    // 固定屬性列表 (同步到客戶端)

    // === 🆕 武器詞綴和屬性加成 (JSON 序列化) ===
    @type("string") modifiersJson: string = "[]";       // 武器詞綴列表（JSON）
    @type("string") bonusesJson: string = "[]";         // 屬性加成列表（JSON）

    // === 🆕 邏輯實例緩存 (不同步到客戶端) ===
    private _logicInstance: WeaponBasic;

    /**
     * 簡單的武器類型推斷（最小邏輯）
     */
    private getWeaponType(type: string): WeaponType {
        return WeaponType[type as keyof typeof WeaponType];
    }

    constructor(weaponId: string, classModule: string) {
        super();
        this.weaponId = weaponId;
        this.uniqueId = UniqueIdGenerator.generateWeaponId();
        this.classModule = classModule;

        const allConfigs = WeaponConfigManager.getAllConfigs();
        // 從武器配置載入顯示資訊
        const config = allConfigs[weaponId];
        if (config) {
            this.name = config.name;
            this.description = config.description || "";
            // rarity 不存在於配置中，使用默認值
            this.weaponType = config.classModule;
            this.weaponBasicDataSetting(config);

        } else {
            throw new Error(`WeaponConfig not found for weaponId: ${weaponId}`);
        }
    }

    /**
     * 🆕 武器設定上也有基本的數值（POE風格）
     * @param config 
     */
    public weaponBasicDataSetting(config: WeaponConfigDefinition) {
        this.baseDamage = config.baseDamage;
        this.attackSpeed = config.attackSpeed;
        this.enabled = config.enabled;
        this.attackRange = config.attackRange;
        this.projectileClass = config.projectileClass || '';
        // 🆕 elementType 已移除，改用 tags
        // 元素資訊現在存儲在 properties 的 tags 中
    }

    /**
     * 🆕 應用所有屬性（三種資料）
     */
    public applyAllProperties(data: {
        statusEffects: PropertyValue[],
        modifiers: any[],
        bonuses: any[]
    }): void {
        // 1. 狀態效果（保留現有邏輯）
        this.fixedProperties = [];
        for (const effect of data.statusEffects) {
            this.updateBaseStats(effect);
            this.fixedProperties.push(effect);
        }

        // 2. 🆕 武器詞綴（JSON 序列化）
        this.modifiersJson = JSON.stringify(data.modifiers);

        // 3. 🆕 屬性加成（JSON 序列化）
        this.bonusesJson = JSON.stringify(data.bonuses);

        console.log(`✅ 武器屬性已應用:`);
        console.log(`   - 狀態效果: ${this.fixedProperties.length} 個`);
        console.log(`   - 武器詞綴: ${data.modifiers.length} 個`);
        console.log(`   - 屬性加成: ${data.bonuses.length} 個`);
    }

    /**
     * ✅ 應用屬性到武器實例 - 舊版相容方法（已棄用）
     * @deprecated 使用 applyAllProperties 代替
     */
    public applyProperties(properties: WeaponPropertiesType): void {
        // 更新基礎屬性（影響戰鬥邏輯）
        this.fixedProperties = [];
        for (const property of [...properties.fixed, ...properties.random]) {
            this.updateBaseStats(property);
            this.fixedProperties.push(property);
        }
    }

    /**
     * 🆕 獲取屬性值列表（使用屬性ID）
     * @deprecated 建議使用 getProperty() 獲取單個屬性
     */
    public getPropertyValue(propertyId: string): PropertyValue[] {
        const property = this.fixedProperties.filter(prop => prop.id === propertyId);
        return property.length > 0 ? property : [];
    }

    /**
     * 🆕 獲取單個屬性（POE風格）
     */
    public getProperty(propertyId: string): PropertyValue | null {
        const properties = this.fixedProperties.filter(prop => prop.id === propertyId);
        if (properties.length === 0) {
            return null;
        }

        // 如果有多個相同屬性（堆疊），合併數值
        if (properties.length === 1 || !properties[0].stackable) {
            return properties[0];
        }

        // 堆疊屬性（合併數值）
        let merged = properties[0];
        for (let i = 1; i < properties.length; i++) {
            merged = {
                ...merged,
                value: merged.value + properties[i].value,
                duration: Math.max(merged.duration, properties[i].duration),
                probability: Math.max(merged.probability, properties[i].probability),
                baseDamage: merged.baseDamage + properties[i].baseDamage,
            };
        }
        return merged;
    }
    public getProperties(): WeaponPropertiesType {
        return {
            fixed: this.fixedProperties,
            random: []
        };
    }

    public hasProperty(propertyId: string): boolean {
        return this.fixedProperties.some(prop => prop.id === propertyId);
    }

    /**
     * 🆕 獲取武器詞綴
     */
    public getModifiers(): any[] {
        try {
            return JSON.parse(this.modifiersJson || "[]");
        } catch (error) {
            console.error('❌ 解析武器詞綴失敗:', error);
            return [];
        }
    }

    /**
     * 🆕 獲取屬性加成
     */
    public getBonuses(): any[] {
        try {
            return JSON.parse(this.bonusesJson || "[]");
        } catch (error) {
            console.error('❌ 解析屬性加成失敗:', error);
            return [];
        }
    }

    /**
     * 🆕 檢查是否有特定詞綴
     */
    public hasModifier(modifierId: string): boolean {
        const modifiers = this.getModifiers();
        return modifiers.some((mod: any) => mod.id === modifierId);
    }
    /**
     * 🆕 更新基礎屬性（使用字符串匹配）
     */
    private updateBaseStats(property: PropertyValue): void {
        const propId = property.id;
        const value = property.value;

        // 基礎武器屬性
        if (propId === 'attack_damage') {
            this.baseDamage += value;
        } else if (propId === 'attack_speed') {
            // 攻擊速度是減少間隔時間
            this.attackSpeed = Math.max(100, this.attackSpeed - value);
        } else if (propId === 'attack_range') {
            this.attackRange += value;
        }
        // 角色屬性加成
        else if (propId === 'strength') {
            this.str += value;
        } else if (propId === 'intelligence') {
            this.int += value;
        } else if (propId === 'vitality') {
            this.vit += value;
        } else if (propId === 'agility') {
            this.agi += value;
        }
        // 其他屬性（戰鬥效果、狀態效果等）不影響基礎屬性
        // 這些會在戰鬥計算時通過屬性系統處理
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

    public Equal(weapon: WeaponSchema): boolean {
        // 快速檢查：如果都有 uniqueId，直接比較
        if (this.uniqueId && weapon.uniqueId) {
            return this.uniqueId === weapon.uniqueId;
        }

        // 詳細檢查所有相關屬性
        return this.weaponId === weapon.weaponId &&
            this.level === weapon.level &&
            this.exp === weapon.exp &&
            this.rarity == weapon.rarity
    }

}