import { ProjectileBasic } from "./ProjectileBasic";
import { BasicProjectile } from "./BasicProjectile";
import { ExplosiveProjectile } from "./ExplosiveProjectile";
import { PiercingProjectile } from "./PiercingProjectile";
import { FreezeProjectile } from "./FreezeProjectile";

/**
 * 投射物工廠 - 根據類型創建對應的投射物實例
 */
export class ProjectileFactory {
    private static instances: Map<string, ProjectileBasic> = new Map();

    /**
     * 創建或獲取投射物實例
     */
    public static getProjectile(
        projectileType: string,
        weaponId: string,
        baseDamage: number
    ): ProjectileBasic {
        const cacheKey = `${projectileType}_${weaponId}_${baseDamage}`;

        if (this.instances.has(cacheKey)) {
            return this.instances.get(cacheKey)!;
        }

        let projectile: ProjectileBasic;

        switch (projectileType) {
            case "explosive":
                projectile = new ExplosiveProjectile();
                break;

            case "piercing":
                projectile = new PiercingProjectile();
                break;

            case "freeze":
            case "ice":
                projectile = new FreezeProjectile();
                break;

            default: // basic
                projectile = new BasicProjectile();
                break;
        }

        projectile.initialize(projectileType, weaponId, baseDamage);
        this.instances.set(cacheKey, projectile);

        console.log(`🎯 創建投射物實例: ${projectileType} (${cacheKey})`);
        return projectile;
    }

    /**
     * 清除緩存
     */
    public static clearCache(): void {
        this.instances.clear();
        console.log("🧹 清除投射物實例緩存");
    }

    /**
     * 獲取緩存狀態
     */
    public static getCacheStats(): { count: number, types: string[] } {
        const types = Array.from(this.instances.keys());
        return {
            count: this.instances.size,
            types: types
        };
    }
}

// 導出所有投射物類型
export { ProjectileBasic } from "./ProjectileBasic";
export { BasicProjectile } from "./BasicProjectile";
export { ExplosiveProjectile } from "./ExplosiveProjectile";
export { PiercingProjectile } from "./PiercingProjectile";
export { FreezeProjectile } from "./FreezeProjectile";