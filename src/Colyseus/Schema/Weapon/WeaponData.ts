import { Schema, type } from "@colyseus/schema";
import { WEAPON_CONFIGS } from "../../../Game/Factories/WeaponConfig";
import { WeaponType } from "@/Types";
import { UniqueIdGenerator } from "../../../Util/UniqueIdGenerator";

/**
 * 武器數據類 - 純數據存儲，負責同步武器狀態到客戶端
 * 不包含業務邏輯，所有計算委託給 WeaponDataService
 */
export class WeaponData extends Schema {
    // === 唯一識別 ===
    @type("string") uniqueId: string = "";              // 武器唯一識別碼

    // === 基本信息 ===
    @type("string") weaponId: string = "";              // 武器類型ID
    @type("string") weaponType: string = "";            // 武器類型
    @type("string") name: string = "";                  // 武器英文名
    // @type("string") displayName: string = "";           // 武器顯示名稱
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

    constructor(weaponId: string = "") {
        super();
        this.weaponId = weaponId;
        this.uniqueId = UniqueIdGenerator.generateWeaponId();
        this.obtainedAt = Date.now();

        // 從武器配置載入顯示資訊
        const config = WEAPON_CONFIGS[weaponId];
        if (config) {
            this.name = config.name;

            this.description = config.description || "";
            this.rarity = config.rarity;
            this.weaponType = config.type;
        } else {
            this.weaponType = this.inferWeaponType(weaponId);
        }
    }

    /**
     * 簡單的武器類型推斷（最小邏輯）
     */
    private inferWeaponType(weaponId: string): WeaponType {
        if (weaponId.includes('bow') || weaponId.includes('gun') || weaponId.includes('ball')) {
            return WeaponType.PROJECTILE;
        } else if (weaponId.includes('sword') || weaponId.includes('bat') || weaponId.includes('knife')) {
            return WeaponType.MELEE;
        } else if (weaponId.includes('heal') || weaponId.includes('buff') || weaponId.includes('staff') || weaponId.includes('wand')) {
            return WeaponType.SUPPORT;
        }
        return WeaponType.MELEE; // 默認近戰
    }
}
