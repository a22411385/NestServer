import { WeaponBasic } from "./WeaponBasic";
import { BaseballBat } from "../MeleeWeapon/BaseballBat";

/**
 * 武器工廠 - 負責創建各種武器實例
 */
export class WeaponFactory {
    private static weaponDefinitions = new Map<string, any>([
        ['baseball_bat', {
            class: BaseballBat,
            name: '球棒',
            type: 'melee',
            rarity: 'common'
        }]
    ]);

    /**
     * 根據武器ID創建武器實例
     */
    public static createWeapon(weaponId: string): WeaponBasic | null {
        const definition = this.weaponDefinitions.get(weaponId);
        if (!definition) {
            console.warn(`Unknown weapon ID: ${weaponId}`);
            return null;
        }

        try {
            return new definition.class();
        } catch (error) {
            console.error(`Failed to create weapon ${weaponId}:`, error);
            return null;
        }
    }

    /**
     * 獲取所有可用武器的資訊
     */
    public static getAllWeapons(): any[] {
        const weapons: any[] = [];

        for (const [id, definition] of this.weaponDefinitions) {
            weapons.push({
                id: id,
                name: definition.name,
                type: definition.type,
                rarity: definition.rarity
            });
        }

        return weapons;
    }

    /**
     * 檢查武器是否存在
     */
    public static weaponExists(weaponId: string): boolean {
        return this.weaponDefinitions.has(weaponId);
    }

    /**
     * 註冊新武器（用於動態添加武器）
     */
    public static registerWeapon(weaponId: string, weaponClass: any, metadata: any): void {
        this.weaponDefinitions.set(weaponId, {
            class: weaponClass,
            ...metadata
        });
    }
}
