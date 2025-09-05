import { ServerBullet } from "../../Colyseus/Schema/Bullet";
import { Vector2 } from "../../Colyseus/Schema/Unit/GameUnit";
import { WeaponBasic } from "../../Colyseus/Schema/Weapon/Baisc/WeaponBasic";
import { WeaponType, BulletCreateConfig, WeaponBulletConfig, BulletType } from "@/Types";

// 移除重複的interface和enum定義，已搬移到Types資料夾

/**
 * 子彈工廠類 - 負責創建不同類型的子彈
 */
export class BulletFactory {

    /**
     * 創建基礎子彈
     */
    public static createBullet(config: BulletCreateConfig): ServerBullet {
        const bullet = new ServerBullet();
        const bulletId = this.generateBulletId();

        bullet.initialize(
            bulletId,
            config.ownerId,
            new Vector2(config.startPosition.x, config.startPosition.y),
            new Vector2(config.direction.x, config.direction.y),
            config.damage,
            config.speed || 300,
            config.bulletType?.toString() || BulletType.BASIC,
            config.weaponId || ""
        );

        // 設置額外屬性
        if (config.pierceCount !== undefined) {
            bullet.pierceCount = config.pierceCount;
        }
        if (config.lifeTime !== undefined) {
            bullet.lifetime = config.lifeTime; // 使用正確的屬性名 'lifetime'
        }

        return bullet;
    }

    /**
     * 根據武器創建子彈
     */
    public static createBulletFromWeapon(config: WeaponBulletConfig): ServerBullet {
        const weapon = config.weapon;
        const damageMultiplier = config.damageMultiplier || 1;

        // 根據武器類型決定子彈屬性
        const bulletConfig: BulletCreateConfig = {
            ownerId: config.ownerId,
            startPosition: { x: config.startPosition.x, y: config.startPosition.y },
            direction: { x: config.direction.x, y: config.direction.y },
            damage: Math.floor(weapon.baseDamage * damageMultiplier),
            speed: this.getWeaponProjectileSpeed(weapon),
            bulletType: this.getWeaponBulletType(weapon),
            pierceCount: this.getWeaponPierceCount(weapon),
            areaOfEffect: this.getWeaponAreaOfEffect(weapon),
            lifeTime: this.getWeaponBulletLifeTime(weapon),
            scale: this.getWeaponBulletScale(weapon),
            weaponId: weapon.weaponId // 添加武器ID
        };

        return this.createBullet(bulletConfig);
    }

    /**
     * 批量創建子彈（用於散彈等）
     */
    public static createMultipleBullets(configs: BulletCreateConfig[]): ServerBullet[] {
        return configs.map(config => this.createBullet(config));
    }

    /**
     * 創建散彈
     */
    public static createShotgunBullets(
        baseConfig: BulletCreateConfig,
        bulletCount: number = 3,
        spreadAngle: number = Math.PI / 6 // 30度擴散
    ): ServerBullet[] {
        const bullets: ServerBullet[] = [];
        const baseDirection = new Vector2(baseConfig.direction.x, baseConfig.direction.y);

        // 計算每個子彈的角度偏移
        const angleStep = spreadAngle / (bulletCount - 1);
        const startAngle = -spreadAngle / 2;

        for (let i = 0; i < bulletCount; i++) {
            const angle = startAngle + (angleStep * i);
            const rotatedDirection = this.rotateVector(baseDirection, angle);

            const bulletConfig: BulletCreateConfig = {
                ...baseConfig,
                direction: { x: rotatedDirection.x, y: rotatedDirection.y },
                damage: Math.floor(baseConfig.damage * 0.8) // 散彈傷害稍微降低
            };

            bullets.push(this.createBullet(bulletConfig));
        }

        return bullets;
    }

    /**
     * 創建爆炸子彈
     */
    public static createExplosiveBullet(config: BulletCreateConfig): ServerBullet {
        const explosiveConfig: BulletCreateConfig = {
            ...config,
            bulletType: BulletType.EXPLOSIVE,
            areaOfEffect: config.areaOfEffect || 100, // 默認爆炸範圍
            speed: (config.speed || 300) * 0.8, // 爆炸彈速度稍慢
        };

        return this.createBullet(explosiveConfig);
    }

    /**
     * 創建穿透子彈
     */
    public static createPiercingBullet(config: BulletCreateConfig, pierceCount: number = 3): ServerBullet {
        const piercingConfig: BulletCreateConfig = {
            ...config,
            bulletType: BulletType.PIERCING,
            pierceCount: pierceCount
        };

        return this.createBullet(piercingConfig);
    }

    /**
     * 根據武器獲取投射物速度
     */
    private static getWeaponProjectileSpeed(weapon: WeaponBasic): number {
        // 根據武器類型返回不同的速度
        switch (weapon.weaponType) {
            case WeaponType.PROJECTILE_WEAPON: return 400;
            case WeaponType.MELEE_WEAPON: return 500; // 近戰武器如果有投射物效果
            case WeaponType.SUPPORT_WEAPON: return 250;
            default: return 300;
        }
    }

    /**
     * 根據武器獲取子彈類型
     */
    private static getWeaponBulletType(weapon: WeaponBasic): BulletType {
        switch (weapon.weaponType) {
            case WeaponType.PROJECTILE_WEAPON:
                return BulletType.ARROW;
            case WeaponType.SUPPORT_WEAPON:
                return BulletType.MAGIC;
            case WeaponType.MELEE_WEAPON:
                return BulletType.BASIC;
            default:
                return BulletType.BASIC;
        }
    }

    /**
     * 根據武器獲取穿透次數
     */
    private static getWeaponPierceCount(weapon: WeaponBasic): number {
        // 可以根據武器屬性或升級等級來決定
        switch (weapon.weaponType) {
            case WeaponType.PROJECTILE_WEAPON: return 2;
            case WeaponType.SUPPORT_WEAPON: return 1;
            default: return 0;
        }
    }

    /**
     * 根據武器獲取爆炸範圍
     */
    private static getWeaponAreaOfEffect(weapon: WeaponBasic): number {
        switch (weapon.weaponType) {
            case WeaponType.SUPPORT_WEAPON: return 80;
            case WeaponType.PROJECTILE_WEAPON: return 0;
            default: return 0;
        }
    }

    /**
     * 根據武器獲取子彈存活時間
     */
    private static getWeaponBulletLifeTime(weapon: WeaponBasic): number {
        // 根據攻擊距離計算存活時間
        const baseLifeTime = (weapon.attackRange / this.getWeaponProjectileSpeed(weapon)) * 1000;
        return Math.max(baseLifeTime, 1000); // 最少1秒
    }

    /**
     * 根據武器獲取子彈縮放
     */
    private static getWeaponBulletScale(weapon: WeaponBasic): number {
        switch (weapon.weaponType) {
            case WeaponType.SUPPORT_WEAPON: return 1.5;
            case WeaponType.PROJECTILE_WEAPON: return 1.2;
            default: return 1.0;
        }
    }

    /**
     * 旋轉向量
     */
    private static rotateVector(vector: Vector2, angle: number): Vector2 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            vector.x * cos - vector.y * sin,
            vector.x * sin + vector.y * cos
        );
    }

    /**
     * 生成唯一的子彈 ID
     */
    private static generateBulletId(): string {
        return `bullet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 獲取預設子彈配置
     */
    public static getDefaultBulletConfig(): Partial<BulletCreateConfig> {
        return {
            speed: 300,
            bulletType: BulletType.BASIC,
            pierceCount: 0,
            areaOfEffect: 0,
            lifeTime: 3000,
            scale: 1.0
        };
    }
}
