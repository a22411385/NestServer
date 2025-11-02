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

    public enabled: boolean = true;


    // === 唯一識別 ===
    @type("string") uniqueId: string = "";              // 武器唯一識別碼

    // === 基本信息 ===
    @type("string") weaponId: string = "";              // 武器類型ID
    @type("string") weaponType: string = "";            // 武器類型
    @type("string") name: string = "";                  // 武器英文名

    @type("string") description: string = "";           // 武器描述
    @type("string") rarity: WeaponQuality = "normal";   // 稀有度
    @type("string") craftingBranch: string = "none";    // 製作分支 (poison/frost/flame/lightning/explosive/none)
    @type("string") elementType: string = "physical";   // 🆕 武器元素類型 (physical/fire/ice/lightning/poison/holy/shadow/arcane)

    // === 玩家培養數據 ===
    @type("number") level: number = 1;                  // 武器等級
    @type("number") exp: number = 0;                    // 當前經驗

    @type("boolean") isEquipped: boolean = false;       // 是否裝備中

    fixedProperties: PropertyValue[] = [];    // 固定屬性列表 (同步到客戶端)

    // === 🆕 武器詞綴和屬性加成 (JSON 序列化) ===
    @type("string") effectPropertiesJson: string = "[]"; // 🆕 狀態效果列表（JSON）- 如燃燒、穿透等
    @type("string") modifiersJson: string = "[]";       // 武器詞綴列表（JSON）
    @type("string") bonusesJson: string = "[]";         // 屬性加成列表（JSON）

    // === 🆕 最終計算屬性緩存 (不同步到客戶端) ===
    private _cachedStats: {};

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
     * ⚠️ 注意: baseDamage/attackSpeed/attackRange 現在只在初始化時使用
     * 實際戰鬥值由 FinalWeaponStats 提供
     */
    public weaponBasicDataSetting(config: WeaponConfigDefinition) {
        // 初始化基礎值（會在 calculateFinalStats 時使用）
        this.enabled = config.enabled;
        this.projectileClass = config.projectileClass || '';

        // 🆕 創建初始 FinalWeaponStats（✅ 使用配置表標準名稱）
        this._cachedStats = {
            weaponDamage: config.baseDamage,    // ✅ 配置表標準名稱
            attackSpeed: config.attackSpeed,    // ✅ 配置表標準名稱
            attackRange: config.attackRange,    // ✅ 配置表標準名稱
            displayName: this.name,
            rarity: this.rarity
        };
    }

    /**
     * 🆕 應用所有屬性（三種資料）
     * ⚠️ 注意: 此方法只存儲原始配置數據，不計算最終屬性
     * 最終屬性由 WeaponDataService.calculateFinalStats() 計算
     */
    public applyAllProperties(data: {
        statusEffects: PropertyValue[],
        modifiers: any[],
        bonuses: any[]
    }): void {
        // 1. 狀態效果（用於 UI 顯示和參考）
        this.fixedProperties = [];
        for (const effect of data.statusEffects) {
            this.fixedProperties.push(effect);
        }
        // 同步到客戶端
        this.effectPropertiesJson = JSON.stringify(data.statusEffects);

        // 2. 武器詞綴（JSON 序列化，同步到客戶端）
        this.modifiersJson = JSON.stringify(data.modifiers);

        // 3. 屬性加成（JSON 序列化，同步到客戶端）
        this.bonusesJson = JSON.stringify(data.bonuses);

        console.log(`✅ 武器屬性已應用:`);
        console.log(`   - 狀態效果: ${this.fixedProperties.length} 個`);
        console.log(`   - 武器詞綴: ${data.modifiers.length} 個`);
        console.log(`   - 屬性加成: ${data.bonuses.length} 個`);
        console.log(`   ⚠️  注意: 最終屬性需要調用 updateFinalStats() 來計算`);
    }

    /**
     * ✅ 應用屬性到武器實例 - 舊版相容方法（已棄用）
     * @deprecated 使用 applyAllProperties 代替
     */
    public applyProperties(properties: WeaponPropertiesType): void {
        // 只存儲屬性，不再修改基礎值
        this.fixedProperties = [];
        for (const property of [...properties.fixed, ...properties.random]) {
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

    // === 🆕 最終屬性管理 ===

    /**
     * 獲取最終計算屬性 (戰鬥系統使用)
     */
    public getFinalStats(): any {
        if (!this._cachedStats) {
            throw new Error(`武器 ${this.weaponId} 的 FinalStats 尚未初始化!請先調用 updateFinalStats()`);
        }
        return this._cachedStats;
    }

    /**
     * 更新最終計算屬性 (在屬性變化時調用)
     */
    public updateFinalStats(stats: any): void {
        this._cachedStats = stats;
        console.log(`✅ 武器 ${this.weaponId} 的 FinalStats 已更新`);
    }

    // === 🆕 標籤系統方法 ===

    /**
     * 🆕 獲取武器完整標籤
     * 從配置表讀取，避免硬編碼
     */
    public getTags(): string[] {
        const config = WeaponConfigManager.getConfig(this.weaponId);
        if (config && config.tags) {
            return config.tags.split(',').map(t => t.trim());
        }

        // 向下兼容：如果配置表沒有標籤，從 classModule 推斷
        return ['weapon', this.classModule.toLowerCase()];
    }

    /**
     * 🆕 獲取元素標籤
     * 用於傷害計算和天賦加成
     */
    public getElementTags(): string[] {
        const allTags = this.getTags();

        // 元素標籤列表
        const elementList = ['fire', 'cold', 'lightning', 'poison', 'physical', 'chaos', 'holy', 'shadow', 'arcane'];
        const elementTags = allTags.filter(tag => elementList.includes(tag));

        // 如果有元素傷害（非物理），添加通用 'elemental' 標籤
        if (elementTags.length > 0 && !elementTags.includes('physical')) {
            elementTags.push('elemental');
        }

        // 如果沒有找到元素標籤，使用 elementType（向下兼容）
        if (elementTags.length === 0) {
            const fallbackElement = this.elementType || 'physical';
            elementTags.push(fallbackElement);

            if (fallbackElement !== 'physical') {
                elementTags.push('elemental');
            }
        }

        return elementTags;
    }

    /**
     * 檢查是否有最終屬性緩存
     */
    public hasFinalStats(): boolean {
        return this._cachedStats !== null;
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