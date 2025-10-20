import { ProjectileBasic } from './ProjectileBasic';
import { BasicProjectile } from './BasicProjectile';
import { ExplosiveProjectile } from './ExplosiveProjectile';
import { PiercingProjectile } from './PiercingProjectile';
import { FreezeProjectile } from './FreezeProjectile';
import { PoisonExplosiveProjectile } from './PoisonExplosiveProjectile';
import { FireExplosiveProjectile } from './FireExplosiveProjectile';

/**
 * 投射物類別註冊表 - 單例模式版本
 * 用於根據類名獲取投射物單例實例
 *
 * 🎯 架構優勢：
 * 1. 支援類名反射 - 直接用字串獲取實例
 * 2. 單例模式 - 每個投射物類型只有一個實例
 * 3. 高性能 - 避免重複創建實例
 * 4. 類型安全 - TypeScript 編譯期檢查
 *
 * 使用範例：
 * ```typescript
 * // 獲取投射物單例
 * const projectile = ProjectileRegistry.getInstance('ExplosiveProjectile');
 * const result = projectile.onHit(bullet, enemy, gameRoom);
 * ```
 *
 * 📝 擴充指南：
 * 1. 創建新的投射物類別（繼承 ProjectileBasic）
 * 2. 實現 getInstance() 靜態方法
 * 3. 調用 register() 註冊類別
 */
export class ProjectileRegistry {
  /**
   * 註冊表：類名 -> getInstance 方法
   */
  private static registry: Map<string, ProjectileBasic> = new Map();

  /**
   * 靜態初始化區塊 - 自動註冊所有內建投射物類別
   */
  static {
    // 註冊基礎投射物類別
    this.register('BasicProjectile', BasicProjectile.getInstance());
    this.register('ExplosiveProjectile', ExplosiveProjectile.getInstance());
    this.register('PiercingProjectile', PiercingProjectile.getInstance());
    this.register('FreezeProjectile', FreezeProjectile.getInstance());

    // 🆕 註冊擴充範例（可根據需要啟用/停用）
    this.register('PoisonExplosiveProjectile', PoisonExplosiveProjectile.getInstance());
    this.register('FireExplosiveProjectile', FireExplosiveProjectile.getInstance());

    console.log(`✅ 投射物註冊表已初始化，共 ${this.registry.size} 個類別`);
    console.log(
      `📋 已註冊類別: ${Array.from(this.registry.keys()).join(', ')}`,
    );
  }

  /**
   * 註冊投射物類別
   *
   * @param className 類名（必須與實際類名一致）
   * @param getInstanceFn 獲取單例的函數
   *
   * @example
   * ```typescript
   * ProjectileRegistry.register('MyProjectile', () => MyProjectile.getInstance());
   * ```
   */
  public static register(
    className: string,
    getInstanceFn: ProjectileBasic,
  ): void {
    if (this.registry.has(className)) {
      console.warn(`⚠️ 投射物類別 "${className}" 已存在，將被覆蓋`);
    }
    this.registry.set(className, getInstanceFn);
    console.log(`📝 註冊投射物類別: ${className}`);
  }

  /**
   * 檢查類別是否已註冊
   *
   * @param className 類名
   * @returns 是否已註冊
   *
   * @example
   * ```typescript
   * if (ProjectileRegistry.has('MyProjectile')) {
   *     // 類別已註冊
   * }
   * ```
   */
  public static has(className: string): boolean {
    return this.registry.has(className);
  }

  /**
   * 獲取所有已註冊的類別名稱
   *
   * @returns 類名陣列
   *
   * @example
   * ```typescript
   * const classes = ProjectileRegistry.getRegisteredClasses();
   * console.log('可用投射物:', classes);
   * ```
   */
  public static getRegisteredClasses(): string[] {
    return Array.from(this.registry.keys());
  }

  public static getRegisteredClasse(className: string): ProjectileBasic {
    const projectile = this.registry.get(className);
    if (!projectile) {
      throw new Error(`⚠️ 投射物類別 "${className}" 未註冊`);
    }
    return projectile;
  }

  /**
   * 取消註冊投射物類別
   *
   * @param className 類名
   * @returns 是否成功取消註冊
   */
  public static unregister(className: string): boolean {
    const result = this.registry.delete(className);
    if (result) {
      console.log(`🗑️ 取消註冊投射物類別: ${className}`);
    } else {
      console.warn(`⚠️ 投射物類別 "${className}" 不存在，無法取消註冊`);
    }
    return result;
  }

  /**
   * 清除所有註冊的類別
   * ⚠️ 謹慎使用！這會移除所有已註冊的投射物類別
   */
  public static clear(): void {
    const count = this.registry.size;
    this.registry.clear();
    console.log(`🧹 清除投射物註冊表（已移除 ${count} 個類別）`);
  }
}
