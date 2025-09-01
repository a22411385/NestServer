import { Schema, type } from "@colyseus/schema";

/**
 * 武器數據類 - 存儲武器的狀態信息（同步到客戶端）
 */
export class WeaponData extends Schema {
    @type("string") weaponId: string = "";
    @type("string") weaponType: string = "";
    @type("number") level: number = 1;
    @type("number") exp: number = 0;
    @type("number") enhanceLevel: number = 0;
    @type("number") durability: number = 100;
    @type("boolean") isEquipped: boolean = false;

    // 武器獲得時間（用於排序）
    @type("number") obtainedAt: number = 0;

    constructor(weaponId: string = "") {
        super();
        this.weaponId = weaponId;
        this.obtainedAt = Date.now();

        // 根據武器ID設置類型
        this.weaponType = this.getWeaponTypeFromId(weaponId);
    }

    /**
     * 根據武器ID推斷武器類型
     */
    private getWeaponTypeFromId(weaponId: string): string {
        if (weaponId.includes('bow') || weaponId.includes('gun') || weaponId.includes('wand')) {
            return 'projectile';
        } else if (weaponId.includes('sword') || weaponId.includes('bat') || weaponId.includes('knife')) {
            return 'melee';
        } else if (weaponId.includes('heal') || weaponId.includes('buff')) {
            return 'support';
        }
        return 'melee'; // 默認近戰
    }

    /**
     * 獲取武器顯示名稱
     */
    public getDisplayName(): string {
        let baseName = this.weaponId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (this.enhanceLevel > 0) {
            baseName += ` +${this.enhanceLevel}`;
        }

        if (this.level > 1) {
            baseName += ` (Lv.${this.level})`;
        }

        return baseName;
    }

    /**
     * 計算武器經驗需求
     */
    public getExpRequirement(): number {
        return this.level * 100 + (this.level - 1) * 50;
    }

    /**
     * 增加經驗
     */
    public addExp(amount: number): boolean {
        this.exp += amount;
        const requiredExp = this.getExpRequirement();

        if (this.exp >= requiredExp && this.level < 100) {
            this.exp -= requiredExp;
            this.level += 1;
            return true; // 升級了
        }

        return false; // 沒升級
    }

    /**
     * 強化武器
     */
    public enhance(): boolean {
        if (this.enhanceLevel >= 15) return false; // 最高強化+15

        this.enhanceLevel += 1;
        this.durability = Math.min(100, this.durability + 5);

        return true;
    }

    /**
     * 修復耐久度
     */
    public repair(amount: number = 100): void {
        this.durability = Math.min(100, this.durability + amount);
    }
}
