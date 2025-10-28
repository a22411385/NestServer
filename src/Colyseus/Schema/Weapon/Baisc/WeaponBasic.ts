import { ServerGameUnit } from '../../Unit/GameUnit';
import { UnitType } from '../../GameState';
import { WeaponType, AttackResult, StatusEffectConfig } from '../../../../Types';
import {
  PropertyTypeValue,
  PropertyValue,
  WeaponConfigDefinition,
} from '@/Types/Equipment/WeaponPropertyTypes';
import { createEffectFromProperty } from '../EffectsParser';
import { WeaponSchema } from '../WeaponSchema';
import { WeaponConfigManager } from '@/Game/Factories/WeaponConfig';


//武器基類：負責攻擊邏輯和目標選擇，不處理傷害計算
// 現在是純邏輯層類，不再同步到客戶端
// 🆕 支持配置驅動的初始化，無需構造函數參數
export abstract class WeaponBasic {


  // 🆕 WeaponSchema 引用 - 作為唯一數據源
  protected weaponSchema: WeaponSchema;

  // 🆕 配置相關
  protected weaponConfig: WeaponConfigDefinition;


  public get weaponId(): string {
    return this.weaponSchema?.weaponId || '';
  }

  public get baseDamage(): number {
    return this.weaponSchema?.baseDamage || 0;
  }

  public get attackSpeed(): number {
    return this.weaponSchema?.attackSpeed || 0;
  }

  public get attackRange(): number {
    return this.weaponSchema?.attackRange || 0;
  }

  public get str(): number {
    return this.weaponSchema?.str || 0;
  }

  public get int(): number {
    return this.weaponSchema?.int || 0;
  }

  public get agi(): number {
    return this.weaponSchema?.agi || 0;
  }

  public get vit(): number {
    return this.weaponSchema?.vit || 0;
  }

  public get projectileClass(): string {
    return this.weaponSchema?.projectileClass || '';
  }

  public get weaponType(): WeaponType {
    return this.weaponSchema.weaponType as WeaponType;
  }

  public get name(): string {
    return this.weaponSchema?.name || '';
  }

  public get description(): string {
    return this.weaponSchema?.description || '';
  }

  public get rarity(): string {
    return this.weaponSchema?.rarity || 'common';
  }

  public get enabled(): boolean {
    return this.weaponSchema?.enabled ?? true;
  }

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
  public initializeFromConfig(weaponId: string) {
    const weaponConfig = WeaponConfigManager.getConfig(weaponId);
    if (!weaponConfig) {
      throw new Error('WeaponConfig 未設置，請先調用 setWeaponSchema');
    }
    this.weaponConfig = weaponConfig;

  }

  /**
   * ✅ 獲取特定屬性值 - 從 WeaponSchema 讀取
   */
  public getProperty(type: PropertyTypeValue): PropertyValue | null {
    if (!this.weaponSchema) return null;

    const properties = this.weaponSchema.getProperties();
    const all = properties.fixed.concat(properties.random);

    const filtered = all.filter(p => p.type === type);
    if (filtered.length === 0) {
      return null;

    }

    if (filtered.length === 1 || !filtered[0].stacked) {
      return filtered[0];
    }

    let statsValue = filtered[0];
    for (let i = 1; i < filtered.length; i++) {
      statsValue = {
        ...statsValue,
        value: statsValue.value + filtered[i].value,
        duration: Math.max(statsValue.duration, filtered[i].duration),
        probability: Math.max(statsValue.probability, filtered[i].probability),
      };
    }
    return statsValue;

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
    const props = this.weaponSchema.getProperties();

    return [...props.fixed, ...props.random];
  }

  /**
   * 🆕 從武器屬性生成狀態效果配置
   * 供 tryAttack 使用,將屬性轉換為可應用的狀態效果
   * 
   * @returns StatusEffectConfig[] - 狀態效果配置數組
   */
  protected generateStatusEffects(): StatusEffectConfig[] {
    const effects: StatusEffectConfig[] = [];
    for (const prop of this.getAllProperties()) {
      const eff = createEffectFromProperty(prop);
      if (eff)
        effects.push(eff);
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
