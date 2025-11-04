import { ServerGameUnit } from '../../Unit/GameUnit';
import { UnitType } from '../../GameState';
import { WeaponType, AttackResult, StatusEffectConfig } from '../../../../Types';
import {
  PropertyValue,
  WeaponConfigDefinition,
  WeaponModifier,
} from '@/Types/Equipment/WeaponPropertyTypes';
import { WeaponSchema } from '../WeaponSchema';
import { WeaponConfigManager } from '@/Game/Factories/WeaponConfig';
import { WeaponDataService } from '@/Game/Services/WeaponDataService';


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
  public get weaponClassMoule(): WeaponType {
    return this.weaponSchema.classModule as WeaponType;
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
   * 🆕 獲取武器詞綴列表（用於 DamageSystem 判斷物理效果）
   */
  public getModifiers(): WeaponModifier[] {
    return this.weaponSchema?.getModifiers() || [];
  }

  /**
   * 🆕 獲取武器標籤列表（用於 BehaviorResolver）
   */
  public getTags(): string[] {
    if (!this.weaponConfig?.tags) return [];
    return this.weaponConfig.tags.split(',').map(t => t.trim());
  }

  /**
   * 🆕 獲取最終計算屬性 (用於戰鬥系統)
   */
  public getFinalStats(): any {
    return this.weaponSchema?.getFinalStats();
  }

  /**
   * 🆕 安全取得武器屬性值（配置驅動）
   * 
   * 📝 功能說明：
   * - 從 FinalWeaponStats 中取得指定屬性
   * - 驗證屬性是否存在於 WeaponStatConfigs 配置表
   * - 提供類型安全和預設值支持
   * 
   * @param statName - 屬性名稱（必須存在於 WeaponStatConfigs 表）
   * @param defaultValue - 當屬性不存在或未初始化時的預設值
   * @returns 屬性值或預設值
   * 
   * @example
   * ```typescript
   * const damage = this.getStat('weaponDamage', 0);     // ✅ 配置表標準名稱
   * const range = this.getStat('attackRange', 100);     // ✅ 配置表標準名稱
   * const speed = this.getStat('attackSpeed', 1000);    // ✅ 配置表標準名稱
   * ```
   */
  protected getStat<T = any>(statName: string, defaultValue: T): T {
    // 🔍 驗證屬性是否在配置表中定義
    if (!WeaponDataService.validateStatName(statName)) {
      const validStats = WeaponDataService.getValidStatNames();
      console.warn(
        `⚠️  武器屬性 "${statName}" 不存在於 WeaponStatConfigs 配置表！\n` +
        `📋 有效屬性列表: ${validStats.join(', ')}`
      );
      return defaultValue;
    }

    // 🛡️ 檢查 WeaponSchema 是否已初始化
    if (!this.weaponSchema) {
      console.warn(`⚠️  WeaponSchema 未初始化，${statName} 返回預設值: ${defaultValue}`);
      return defaultValue;
    }

    // 📊 從 FinalStats 讀取屬性
    try {
      const stats = this.getFinalStats();
      if (!stats) {
        console.warn(`⚠️  FinalStats 未初始化，${statName} 返回預設值: ${defaultValue}`);
        return defaultValue;
      }

      // 檢查屬性是否存在
      if (!(statName in stats)) {
        console.warn(`⚠️  FinalStats 中不存在屬性 "${statName}"，返回預設值: ${defaultValue}`);
        return defaultValue;
      }

      const value = stats[statName];
      return value !== undefined && value !== null ? value : defaultValue;
    } catch (error) {
      console.error(`❌ 讀取屬性 "${statName}" 時發生錯誤:`, error);
      return defaultValue;
    }
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

  // ==================== 基礎屬性 Getter（配置驅動）====================

  /**
   * 🆕 基礎傷害（從 FinalWeaponStats 讀取）
   * 配置驅動：必須存在於 WeaponStatConfigs 表
   * ✅ 使用配置表標準名稱: weaponDamage
   */
  public get baseDamage(): number {
    return this.getStat<number>('weaponDamage', 0);
  }

  /**
   * 🆕 攻擊範圍（從 FinalWeaponStats 讀取）
   * 配置驅動：必須存在於 WeaponStatConfigs 表
   * ✅ 使用配置表標準名稱: attackRange
   */
  public get attackRange(): number {
    return this.getStat<number>('attackRange', 0);
  }

  /**
   * 🆕 攻擊速度（從 FinalWeaponStats 讀取）
   * 配置驅動：必須存在於 WeaponStatConfigs 表
   * ✅ 使用配置表標準名稱: attackSpeed
   * @returns 毫秒（預設 1000ms = 1秒）
   */
  public get attackSpeed(): number {
    return this.getStat<number>('attackSpeed', 1000);
  }

  // ====================================================================

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
   * 🆕 從屬性系統生成狀態效果配置（增強版 + 標籤系統）
   * 將 PropertyValue[] 轉換為 StatusEffectConfig[]
   * 
   * 📝 轉換規則：
   * - 只處理 category 為 'debuff' 或 'buff' 的屬性
   * - 只包含有觸發機率的效果（probability > 0）
   * - duration 從秒轉換為毫秒
   * - 🆕 攜帶標籤信息（用於天賦加成）
   * 
   * @returns StatusEffectConfig[] - 狀態效果配置列表
   */
  protected generateStatusEffects(): StatusEffectConfig[] {
    if (!this.weaponSchema) return [];

    // ✅ 從 WeaponSchema 取得所有屬性
    const properties = this.weaponSchema.getProperties();
    const allProperties = [...properties.fixed, ...properties.random];
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

          // 🆕 攜帶標籤信息（從 PropertyValue 複製）
          tags: prop.tags || [],
          baseDamage: prop.baseDamage || 0,
          damageScaling: prop.damageScaling || 0,
        });
      }
    }

    return statusEffects;
  }

  /**
   * 🆕 生成基礎 AttackResult（攜帶標籤信息）
   * 子類可以在此基礎上擴展
   */
  protected generateBaseAttackResult(attackerId: string, targetIds: string[]): AttackResult {
    return {
      success: true,
      attackerId: attackerId,
      weaponId: this.weaponId,
      targetIds: targetIds,
      baseDamage: this.baseDamage,

      // 🆕 攜帶標籤信息（確保無重複）
      tags: Array.from(new Set(this.weaponSchema?.getTags() || [])),
      elementTags: Array.from(new Set(this.weaponSchema?.getElementTags() || ['physical'])),
      modifiers: this.weaponSchema?.getModifiers() || [],

      // 狀態效果（已包含標籤）
      statusEffects: this.generateStatusEffects(),
    };
  }
}
