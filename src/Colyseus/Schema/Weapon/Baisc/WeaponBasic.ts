import { ServerGameUnit } from "../../Unit/GameUnit";
import { UnitType } from "../../GameState";
import { WeaponType, AttackResult } from "../../../../Types";
import { WeaponPropertyValue, WeaponPropertyType } from "../../../../Types/Equipment/WeaponPropertyTypes";
// 移除 Schema 導入，WeaponBasic 現在是純邏輯層類

//武器基類：負責攻擊邏輯和目標選擇，不處理傷害計算
// 現在是純邏輯層類，不再同步到客戶端
export abstract class WeaponBasic {
    public weaponId: string = "";
    public weaponType: WeaponType = WeaponType.MELEE_WEAPON;
    public attackRange: number = 0;
    public baseDamage: number = 0; // 基礎傷害
    public attackSpeed: number = 0;  // 攻擊間隔 (毫秒)
    public rarity: string = "common"; // 武器稀有度
    public name: string = "";

    // 傳統屬性加成 (保留向下兼容性，但會被新屬性系統覆寫)
    public int: number = 0;
    public agi: number = 0;
    public str: number = 0;
    public vit: number = 0;

    // 新增：動態屬性系統
    protected properties: Map<WeaponPropertyType, WeaponPropertyValue> = new Map();

    // 服務器端屬性
    protected lastAttackTime: number = 0;

    constructor(weaponId: string, weaponType: WeaponType, attackRange: number, baseDamage: number, attackSpeed: number) {
        this.weaponId = weaponId;
        this.weaponType = weaponType;
        this.attackRange = attackRange;
        this.baseDamage = baseDamage;
        this.attackSpeed = attackSpeed;
    }

    /**
     * 應用屬性到武器實例
     */
    public applyProperties(properties: WeaponPropertyValue[]): void {
        this.properties.clear();

        for (const property of properties) {
            this.properties.set(property.type, property);

            // 更新基礎屬性
            this.updateBaseStats(property);
        }

        console.log(`🔧 ${this.weaponId} 應用了 ${properties.length} 個屬性`);
    }

    /**
     * 更新基礎屬性
     */
    private updateBaseStats(property: WeaponPropertyValue): void {
        switch (property.type) {
            // 基礎武器屬性
            case WeaponPropertyType.ATTACK_DAMAGE:
                this.baseDamage += typeof property.value === 'number' ? property.value : property.value[0];
                break;
            case WeaponPropertyType.ATTACK_SPEED:
                // 攻擊速度是減少間隔時間，所以是減法
                const speedBonus = typeof property.value === 'number' ? property.value : property.value[0];
                this.attackSpeed = Math.max(100, this.attackSpeed - speedBonus); // 最小間隔100ms
                break;
            case WeaponPropertyType.ATTACK_RANGE:
                this.attackRange += typeof property.value === 'number' ? property.value : property.value[0];
                break;

            // 投射物屬性
            case WeaponPropertyType.PROJECTILE_SPEED:
            case WeaponPropertyType.AREA_OF_EFFECT:
            case WeaponPropertyType.PIERCE_COUNT:
            case WeaponPropertyType.SWEEP_ANGLE:
                // 這些屬性會在具體的武器子類中使用
                break;

            // 治療和輔助屬性
            case WeaponPropertyType.HEAL_AMOUNT:
            case WeaponPropertyType.BUFF_DURATION:
            case WeaponPropertyType.SUPPORT_RADIUS:
                // 輔助武器專用屬性
                break;

            // 角色屬性加成 (保持向下兼容)
            case WeaponPropertyType.STRENGTH:
                this.str += typeof property.value === 'number' ? property.value : property.value[0];
                break;
            case WeaponPropertyType.INTELLIGENCE:
                this.int += typeof property.value === 'number' ? property.value : property.value[0];
                break;
            case WeaponPropertyType.VITALITY:
                this.vit += typeof property.value === 'number' ? property.value : property.value[0];
                break;
            case WeaponPropertyType.AGILITY:
                this.agi += typeof property.value === 'number' ? property.value : property.value[0];
                break;

            // 戰鬥特效屬性 - 在攻擊時處理
            case WeaponPropertyType.KNOCKBACK:
            case WeaponPropertyType.CRITICAL_CHANCE:
            case WeaponPropertyType.CRITICAL_DAMAGE:
            case WeaponPropertyType.LIFE_STEAL:
            case WeaponPropertyType.PIERCING:
            case WeaponPropertyType.CHAIN_ATTACK:
            case WeaponPropertyType.SPLASH_DAMAGE:
                // 這些屬性在 tryAttack 或傷害計算時處理
                break;

            // 狀態效果屬性 - 在攻擊時處理
            case WeaponPropertyType.STUN:
            case WeaponPropertyType.FREEZE:
            case WeaponPropertyType.BURN:
            case WeaponPropertyType.POISON:
            case WeaponPropertyType.SLOW:
                // 這些屬性在攻擊命中時觸發
                break;

            default:
                console.log(`🔧 未處理的屬性類型: ${property.type}`);
                break;
        }
    }

    /**
     * 獲取特定屬性值
     */
    public getProperty(type: WeaponPropertyType): WeaponPropertyValue | null {
        return this.properties.get(type) || null;
    }

    /**
     * 獲取屬性數值
     */
    public getPropertyValue(type: WeaponPropertyType): number | number[] | null {
        const property = this.getProperty(type);
        return property ? property.value : null;
    }

    /**
     * 檢查是否有特定屬性
     */
    public hasProperty(type: WeaponPropertyType): boolean {
        return this.properties.has(type);
    }

    /**
     * 獲取所有屬性
     */
    public getAllProperties(): WeaponPropertyValue[] {
        return Array.from(this.properties.values());
    }

    /**
     * 嘗試攻擊 - 只負責攻擊邏輯和目標選擇，不處理傷害
     */
    public abstract tryAttack(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): AttackResult;

    /**
     * 檢查是否可以攻擊
     */
    protected canAttack(): boolean {
        const currentTime = Date.now();
        return (currentTime - this.lastAttackTime) >= this.attackSpeed;
    }

    /**
     * 更新最後攻擊時間
     */
    protected updateLastAttackTime(): void {
        this.lastAttackTime = Date.now();
    }

    /**
     * 通用的目標選擇輔助方法 - 按距離排序
     */
    protected findTargetsInRange(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        range: number,
        maxTargets: number = 1
    ): ServerGameUnit[] {
        // 只攻擊對立類型的單位
        const targetType = attacker.type === UnitType.hero ? UnitType.enemy : UnitType.hero;

        const targetsWithDistance: Array<{ target: ServerGameUnit, distance: number }> = [];

        for (const target of potentialTargets) {
            if (target.type !== targetType || target.isDead) continue;

            const distance = Math.hypot(
                target.position.x - attacker.position.x,
                target.position.y - attacker.position.y
            );

            if (distance <= range) {
                targetsWithDistance.push({ target, distance });
            }
        }

        // 按距離排序，最近的優先
        targetsWithDistance.sort((a, b) => a.distance - b.distance);

        // 返回最近的 maxTargets 個目標
        return targetsWithDistance
            .slice(0, maxTargets)
            .map(item => item.target);
    }

    /**
     * 扇形範圍目標選擇 - 按距離排序
     */
    protected findTargetsInFanArea(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[],
        range: number,
        sweepAngle: number,
        facingDirection: number,

    ): ServerGameUnit[] {
        // 只攻擊對立類型的單位
        const targetType = attacker.type === UnitType.hero ? UnitType.enemy : UnitType.hero;

        const targetsWithDistance: Array<{ target: ServerGameUnit, distance: number }> = [];

        for (const target of potentialTargets) {
            if (target.type !== targetType || target.isDead) continue;

            // 檢查距離
            const distance = Math.hypot(
                target.position.x - attacker.position.x,
                target.position.y - attacker.position.y
            );

            if (distance > range) continue;

            // 檢查角度
            const targetDirection = Math.atan2(
                target.position.y - attacker.position.y,
                target.position.x - attacker.position.x
            );

            let angleDiff = Math.abs(targetDirection - facingDirection);
            if (angleDiff > Math.PI) {
                angleDiff = 2 * Math.PI - angleDiff;
            }

            if (angleDiff <= sweepAngle / 2) {
                targetsWithDistance.push({ target, distance });
            }
        }

        // 按距離排序，最近的優先
        targetsWithDistance.sort((a, b) => a.distance - b.distance);

        return targetsWithDistance.map(item => item.target);
    }

    /**
     * 找出有效目標 - 子類實現具體邏輯
     */
    protected abstract findValidTargets(
        attacker: ServerGameUnit,
        potentialTargets: ServerGameUnit[]
    ): ServerGameUnit[];

    // Getter 方法
    public get range(): number { return this.attackRange; }
    public get damage(): number { return this.baseDamage; }
    public get cooldown(): number { return this.attackSpeed; }
}
