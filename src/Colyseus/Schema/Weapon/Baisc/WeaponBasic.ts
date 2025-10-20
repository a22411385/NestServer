import { ServerGameUnit } from '../../Unit/GameUnit';
import { UnitType } from '../../GameState';
import { WeaponType, AttackResult, PropertyType, StatusEffectConfig } from '../../../../Types';
import {
  PropertyValue,
  WeaponConfigDefinition,
} from '@/Types/Equipment/WeaponPropertyTypes';
import { getWeaponConfig } from '../../../../Game/Factories/WeaponConfig';

// ✅ 引入 WeaponSchema 類型（避免循環依賴，使用延遲導入）
type WeaponSchema = import('../WeaponSchema').WeaponSchema;

//武器基類：負責攻擊邏輯和目標選擇，不處理傷害計算
// 現在是純邏輯層類，不再同步到客戶端
// 🆕 支持配置驅動的初始化，無需構造函數參數
export abstract class WeaponBasic {
  public weaponId: string = '';
  public projectileClass: string = ''; // 投射物類型
  public weaponType: WeaponType = WeaponType.MELEE_WEAPON;
  public attackRange: number = 0;
  public baseDamage: number = 0; // 基礎傷害
  public attackSpeed: number = 0; // 攻擊間隔 (毫秒)
  public rarity: string = 'common'; // 武器稀有度
  public name: string = '';
  public description: string = '';
  public enabled: boolean = true;

  // 傳統屬性加成 (保留向下兼容性，但會被新屬性系統覆寫)
  public int: number = 0;
  public agi: number = 0;
  public str: number = 0;
  public vit: number = 0;

  // ❌ 移除：動態屬性系統改由 WeaponSchema 管理
  // protected properties: Map<string, PropertyValue> = new Map();

  // 🆕 WeaponSchema 引用 - 作為唯一數據源
  protected weaponSchema: WeaponSchema | null = null;

  // 🆕 配置相關
  protected weaponConfig: WeaponConfigDefinition | null = null;

  // 服務器端屬性
  protected lastAttackTime: number = 0;

  constructor() {
    // 🆕 無參數構造函數，等待配置初始化
  }

  /**
   * 🆕 設置 WeaponSchema 引用 - 必須在初始化時調用
   */
  public setWeaponSchema(schema: WeaponSchema): void {
    this.weaponSchema = schema;
  }

  /**
   * 🆕 從配置初始化武器 - 新的標準初始化方法
   */
  public initializeFromConfig(weaponId: string): boolean {
    this.weaponConfig = getWeaponConfig(weaponId);

    if (!this.weaponConfig) {
      console.error(`❌ 無法找到武器配置: ${weaponId}`);
      return false;
    }

    // 設置基礎屬性
    this.weaponId = this.weaponConfig.id;
    this.name = this.weaponConfig.name;
    this.description = this.weaponConfig.description || '';
    this.baseDamage = this.weaponConfig.baseDamage;
    this.attackSpeed = this.weaponConfig.attackSpeed;
    this.attackRange = this.weaponConfig.attackRange;
    this.enabled = this.weaponConfig.enabled !== false;

    this.projectileClass = this.weaponConfig.projectileClass;
    this.weaponType = this.weaponConfig.classModule as WeaponType;

    // 調用子類的配置特定初始化
    this.applyWeaponSpecificConfig();

    console.log(`✅ 武器已從配置初始化: ${this.name} (${this.weaponId})`);
    return true;
  }

  /**
   * 🆕 子類實現的特定配置應用方法
   */
  protected abstract applyWeaponSpecificConfig(): void;

  /**
   * ✅ 獲取固定屬性列表 - 從 WeaponSchema 讀取
   */
  public getFixedProperties(): string[] {
    if (!this.weaponSchema) return [];
    return Array.from(this.weaponSchema.fixedProperties);
  }

  /**
   * ✅ 獲取隨機屬性列表 - 從 WeaponSchema 讀取
   */
  public getRandomProperties(): string[] {
    if (!this.weaponSchema) return [];
    return Array.from(this.weaponSchema.randomProperties);
  }

  /**
   * ✅ 應用屬性到武器實例 - 同步到 WeaponSchema
   */
  public applyProperties(properties: PropertyValue[]): void {
    // ✅ 同步到 WeaponSchema（唯一數據源）
    if (this.weaponSchema) {
      this.weaponSchema.setProperties(properties);
    }

    // 更新基礎屬性（影響戰鬥邏輯）
    for (const property of properties) {
      this.updateBaseStats(property);
    }

    console.log(`🔧 ${this.weaponId} 應用了 ${properties.length} 個屬性`);
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

      // 投射物屬性
      case PropertyType.PROJECTILE_SPEED:
      case PropertyType.AREA_OF_EFFECT:
      case PropertyType.PIERCE_COUNT:
      case PropertyType.SWEEP_ANGLE:
        // 這些屬性會在具體的武器子類中使用
        break;

      // 治療和輔助屬性
      case PropertyType.HEAL_AMOUNT:
      case PropertyType.BUFF_DURATION:
      case PropertyType.SUPPORT_RADIUS:
        // 輔助武器專用屬性
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

      // 戰鬥特效屬性 - 在攻擊時處理
      case PropertyType.KNOCKBACK:
      case PropertyType.CRITICAL_CHANCE:
      case PropertyType.CRITICAL_DAMAGE:
      case PropertyType.LIFE_STEAL:
      case PropertyType.PIERCING:
      case PropertyType.CHAIN_ATTACK:
      case PropertyType.SPLASH_DAMAGE:
        // 這些屬性在 tryAttack 或傷害計算時處理
        break;

      // 狀態效果屬性 - 在攻擊時處理
      case PropertyType.STUN:
      case PropertyType.FREEZE:
      case PropertyType.BURN:
      case PropertyType.POISON:
      case PropertyType.SLOW:
        // 這些屬性在攻擊命中時觸發
        break;

      default:
        console.log(`🔧 未處理的屬性類型: ${property.type}`);
        break;
    }
  }

  /**
   * ✅ 獲取特定屬性值 - 從 WeaponSchema 讀取
   */
  public getProperty(type: string): PropertyValue | null {
    if (!this.weaponSchema) return null;

    const properties = this.weaponSchema.getProperties();
    return properties.find(p => p.type === type) || null;
  }

  /**
   * ✅ 獲取屬性數值 - 從 WeaponSchema 讀取
   */
  public getPropertyValue(type: string): number | number[] | null {
    if (!this.weaponSchema) return null;
    return this.weaponSchema.getPropertyValue(type);
  }

  /**
   * ✅ 檢查是否有特定屬性 - 從 WeaponSchema 讀取
   */
  public hasProperty(type: string): boolean {
    if (!this.weaponSchema) return false;
    return this.weaponSchema.hasProperty(type);
  }

  /**
   * ✅ 獲取所有屬性 - 從 WeaponSchema 讀取
   */
  public getAllProperties(): PropertyValue[] {
    if (!this.weaponSchema) return [];
    return this.weaponSchema.getProperties();
  }

  /**
   * 🆕 從武器屬性生成狀態效果配置
   * 供 tryAttack 使用,將屬性轉換為可應用的狀態效果
   * 
   * @returns StatusEffectConfig[] - 狀態效果配置數組
   */
  protected generateStatusEffects(): StatusEffectConfig[] {
    const effects: StatusEffectConfig[] = [];

    // 暈眩效果 [機率, 持續時間]
    const stunValue = this.getPropertyValue('stun');
    if (Array.isArray(stunValue) && stunValue.length >= 2) {
      effects.push({
        type: 'stun',
        chance: stunValue[0],
        duration: stunValue[1] * 1000, // 轉換為毫秒
      });
    }

    // 冰凍效果 [持續時間]
    const freezeValue = this.getPropertyValue('freeze');
    if (typeof freezeValue === 'number') {
      effects.push({
        type: 'freeze',
        duration: freezeValue * 1000, // 轉換為毫秒
      });
    }

    // 燃燒效果 [持續時間, 每秒傷害]
    const burnValue = this.getPropertyValue('burn');
    if (Array.isArray(burnValue) && burnValue.length >= 2) {
      effects.push({
        type: 'burn',
        duration: burnValue[0] * 1000, // 轉換為毫秒
        value: burnValue[1], // 每秒傷害
      });
    }

    // 中毒效果 [持續時間, 每秒傷害]
    const poisonValue = this.getPropertyValue('poison');
    if (Array.isArray(poisonValue) && poisonValue.length >= 2) {
      effects.push({
        type: 'poison',
        duration: poisonValue[0] * 1000, // 轉換為毫秒
        value: poisonValue[1], // 每秒傷害
      });
    }

    // 減速效果 [機率, 持續時間, 減速百分比]
    const slowValue = this.getPropertyValue('slow');
    if (Array.isArray(slowValue) && slowValue.length >= 3) {
      effects.push({
        type: 'slow',
        chance: slowValue[0],
        duration: slowValue[1] * 1000, // 轉換為毫秒
        value: slowValue[2], // 減速百分比
      });
    }

    // 擊退效果 [力量]
    const knockbackValue = this.getPropertyValue('knockback');
    if (typeof knockbackValue === 'number') {
      effects.push({
        type: 'knockback',
        duration: 0, // 擊退是瞬間效果
        value: knockbackValue,
      });
    }

    return effects;
  }

  /**
   * 嘗試攻擊 - 只負責攻擊邏輯和目標選擇，不處理傷害
   */
  public abstract tryAttack(
    attacker: ServerGameUnit,
    potentialTargets: ServerGameUnit[],
  ): AttackResult;

  /**
   * 檢查是否可以攻擊
   */
  protected canAttack(): boolean {
    const currentTime = Date.now();
    return currentTime - this.lastAttackTime >= this.attackSpeed;
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
    maxTargets: number = 1,
  ): ServerGameUnit[] {
    // 只攻擊對立類型的單位
    const targetType =
      attacker.type === UnitType.hero ? UnitType.enemy : UnitType.hero;

    const targetsWithDistance: Array<{
      target: ServerGameUnit;
      distance: number;
    }> = [];

    for (const target of potentialTargets) {
      if (target.type !== targetType || target.isDead) continue;

      const distance = Math.hypot(
        target.position.x - attacker.position.x,
        target.position.y - attacker.position.y,
      );

      if (distance <= range) {
        targetsWithDistance.push({ target, distance });
      }
    }

    // 按距離排序，最近的優先
    targetsWithDistance.sort((a, b) => a.distance - b.distance);

    // 返回最近的 maxTargets 個目標
    return targetsWithDistance.slice(0, maxTargets).map((item) => item.target);
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
    const targetType =
      attacker.type === UnitType.hero ? UnitType.enemy : UnitType.hero;

    const targetsWithDistance: Array<{
      target: ServerGameUnit;
      distance: number;
    }> = [];

    for (const target of potentialTargets) {
      if (target.type !== targetType || target.isDead) continue;

      // 檢查距離
      const distance = Math.hypot(
        target.position.x - attacker.position.x,
        target.position.y - attacker.position.y,
      );

      if (distance > range) continue;

      // 檢查角度
      const targetDirection = Math.atan2(
        target.position.y - attacker.position.y,
        target.position.x - attacker.position.x,
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

    return targetsWithDistance.map((item) => item.target);
  }

  /**
   * 找出有效目標 - 子類實現具體邏輯
   */
  protected abstract findValidTargets(
    attacker: ServerGameUnit,
    potentialTargets: ServerGameUnit[],
  ): ServerGameUnit[];

  // Getter 方法
  public get range(): number {
    return this.attackRange;
  }
  public get damage(): number {
    return this.baseDamage;
  }
  public get cooldown(): number {
    return this.attackSpeed;
  }
}
