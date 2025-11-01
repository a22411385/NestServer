import { ServerGameUnit } from '../../Unit/GameUnit';
import { UnitType } from '../../GameState';
import { WeaponType, AttackResult, StatusEffectConfig } from '../../../../Types';
import {
  PropertyValue,
  WeaponConfigDefinition,
} from '@/Types/Equipment/WeaponPropertyTypes';
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
   * 🆕 獲取特定屬性值 - 從 WeaponSchema 讀取（使用屬性ID）
   */
  public getProperty(propertyId: string): PropertyValue | null {
    if (!this.weaponSchema) return null;

    const properties = this.weaponSchema.getProperties();
    const all = properties.fixed.concat(properties.random);

    const filtered = all.filter(p => p.id === propertyId);
    if (filtered.length === 0) {
      return null;
    }

    if (filtered.length === 1 || !filtered[0].stackable) {
      return filtered[0];
    }

    // 堆疊屬性（合併數值）
    let statsValue = filtered[0];
    for (let i = 1; i < filtered.length; i++) {
      statsValue = {
        ...statsValue,
        value: statsValue.value + filtered[i].value,
        duration: Math.max(statsValue.duration, filtered[i].duration),
        probability: Math.max(statsValue.probability, filtered[i].probability),
        baseDamage: statsValue.baseDamage + filtered[i].baseDamage,
      };
    }
    return statsValue;
  }

  /**
   * 🆕 檢查是否有特定屬性 - 從 WeaponSchema 讀取
   */
  public hasProperty(propertyId: string): boolean {
    if (!this.weaponSchema) return false;
    return this.weaponSchema.hasProperty(propertyId);
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

  /**
   * 🆕 從屬性系統生成狀態效果配置
   * 將 PropertyValue[] 轉換為 StatusEffectConfig[]
   * 
   * 📝 轉換規則：
   * - 只處理 category 為 'debuff' 或 'buff' 的屬性
   * - 只包含有觸發機率的效果（probability > 0）
   * - duration 從秒轉換為毫秒
   * 
   * @returns StatusEffectConfig[] - 狀態效果配置列表
   */
  protected generateStatusEffects(): StatusEffectConfig[] {
    const allProperties = this.getAllProperties();
    const statusEffects: StatusEffectConfig[] = [];

    for (const prop of allProperties) {
      // 只處理 debuff/buff 類別的屬性
      if (prop.category !== 'debuff' && prop.category !== 'buff') {
        continue;
      }

      // 只包含有機率觸發的效果
      if (prop.probability > 0) {
        statusEffects.push({
          type: prop.id,                    // 使用屬性ID (如 'burn', 'stun', 'freeze')
          duration: prop.duration * 1000,   // 秒 → 毫秒
          value: prop.value,                // 效果數值
          chance: prop.probability,         // 觸發機率 (0-100)
          category: prop.category,          // 類別
        });
      }
    }

    return statusEffects;
  }

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
