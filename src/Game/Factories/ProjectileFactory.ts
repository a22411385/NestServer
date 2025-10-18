import { ProjectileBasic, ProjectileRegistry } from "@/Colyseus/Schema/Projectile";

/**
 * 投射物工廠 - 使用註冊表獲取投射物單例
 * 
 * 🎯 新架構優勢（單例模式）：
 * 1. 支援類名反射獲取實例
 * 2. 每個投射物類型只有一個實例
 * 3. 高性能 - 避免重複創建實例
 * 4. 類型安全 - TypeScript 編譯期檢查
 * 
 * 使用範例：
 * ```typescript
 * // 獲取投射物單例
 * const projectile = ProjectileFactory.getProjectile('ExplosiveProjectile');
 * const result = projectile.onHit(bullet, enemy, gameRoom);
 * ```
 */
export class ProjectileFactory {
    /**
     * 獲取投射物單例實例
     * @param projectileClassName 投射物類名（如 'ExplosiveProjectile', 'PoisonExplosiveProjectile'）
     */
    public static getProjectile(projectileClassName: string): ProjectileBasic {
        return ProjectileRegistry.getInstance(projectileClassName);
    }

    /**
     * 🆕 根據舊的字串類型獲取投射物（向下兼容）
     * @deprecated 建議使用完整類名，如 'ExplosiveProjectile'
     */
    public static getProjectileByType(projectileType: string): ProjectileBasic {
        // 映射舊的類型名稱到新的類名
        const typeToClassName: Record<string, string> = {
            'basic': 'BasicProjectile',
            'explosive': 'ExplosiveProjectile',
            'piercing': 'PiercingProjectile',
            'freeze': 'FreezeProjectile',
            'ice': 'FreezeProjectile',
        };

        const className = typeToClassName[projectileType.toLowerCase()] || 'BasicProjectile';
        return this.getProjectile(className);
    }

    /**
     * 獲取所有已註冊的投射物類型
     */
    public static getRegisteredTypes(): string[] {
        return ProjectileRegistry.getRegisteredClasses();
    }
}
