/**
 * 投射物配置系統類型定義
 * 用於管理豐富的美術資源和遊戲邏輯
 */

export enum ProjectileCategory {
    MAGIC_BALL = 'magic_ball',     // 魔法球類 (火球、冰球、毒球)
    WEAPON = 'weapon',             // 武器投射物 (飛刀、箭矢)
    ENERGY = 'energy',             // 能量類 (雷電、光束)
    PHYSICAL = 'physical',         // 物理類 (石頭、鐵球)
    SPECIAL = 'special'            // 特殊類 (治療球、盾牌)
}

export enum TrajectoryType {
    STRAIGHT = 'straight',         // 直線
    ARC = 'arc',                  // 拋物線
    CURVE = 'curve',              // 曲線
    HOMING = 'homing',            // 追蹤
    SPIRAL = 'spiral'             // 螺旋
}

export enum DamageType {
    PHYSICAL = 'physical',
    FIRE = 'fire',
    ICE = 'ice',
    POISON = 'poison',
    LIGHTNING = 'lightning',
    ARCANE = 'arcane',
    HEALING = 'healing'
}

export enum SpecialEffect {
    CHAIN_LIGHTNING = 'chain_lightning',  // 連鎖閃電
    RICOCHET = 'ricochet',               // 彈跳
    SPLIT = 'split',                     // 分裂
    SUMMON = 'summon',                   // 召喚
    TELEPORT = 'teleport'                // 傳送
}

export interface ProjectileVisual {
    spriteKey: string;             // Phaser 精靈鍵值
    atlasKey?: string;             // 圖集鍵值（如果使用圖集）
    frameKey?: string;             // 幀鍵值

    scale: number;                 // 縮放比例
    width: number;                 // 碰撞寬度
    height: number;                // 碰撞高度

    animation?: {
        key: string;               // 動畫鍵值
        frameRate: number;         // 幀率
        repeat: number;            // 重複次數 (-1 為無限)
    };

    rotateWithDirection: boolean;  // 是否隨方向旋轉
    rotationOffset: number;        // 旋轉偏移角度

    tint?: number;                 // 色調
    alpha: number;                 // 透明度
    glowEffect?: {
        color: number;
        intensity: number;
    };
}

export interface ProjectilePhysics {
    speed: number;                 // 基礎速度
    acceleration?: number;         // 加速度
    maxSpeed?: number;             // 最大速度

    trajectory: TrajectoryType;

    trajectoryParams?: {
        gravity?: number;          // 重力 (拋物線軌跡用)
        curve?: number;            // 曲線程度 (曲線軌跡用)
        homing?: {                 // 追蹤參數
            turnSpeed: number;
            detectionRange: number;
        };
    };

    maxDistance: number;           // 最大飛行距離
    penetration: number;           // 穿透次數
}

export interface ProjectileCombat {
    baseDamage: number;           // 基礎傷害
    damageType: DamageType;       // 傷害類型

    areaOfEffect?: {
        radius: number;            // 爆炸半徑
        damage: number;            // 範圍傷害
        falloff: boolean;          // 是否有傷害衰減
    };

    statusEffects?: ProjectileStatusEffect[];
    specialEffects?: SpecialEffect[];
}

export interface ProjectileStatusEffect {
    type: string;                 // 狀態類型 (burn, freeze, poison, etc.)
    chance: number;               // 觸發機率 (0-100)
    duration: number;             // 持續時間 (秒)
    value: number;                // 效果數值
}

export interface ProjectileEffects {
    launchEffect?: {
        particle: string;          // 粒子系統
        duration: number;          // 持續時間
        followProjectile: boolean; // 是否跟隨投射物
    };

    trailEffect?: {
        particle: string;
        width: number;
        fadeTime: number;
    };

    hitEffect?: {
        particle: string;
        scale: number;
        duration: number;
    };

    explosionEffect?: {
        particle: string;
        scale: number;
        duration: number;
        shakeScreen: boolean;
    };
}

export interface ProjectileAudio {
    launchSound?: string;          // 發射音效
    flightSound?: string;          // 飛行音效
    hitSound?: string;             // 命中音效
    explosionSound?: string;       // 爆炸音效

    volume: number;                // 音量 (0-1)
    pitchVariation: number;        // 音調變化範圍
}

export interface ProjectileConfig {
    id: string;                    // 唯一ID
    name: string;                  // 顯示名稱
    category: ProjectileCategory;  // 投射物分類
    enabled: boolean;              // 是否啟用

    visual: ProjectileVisual;
    physics: ProjectilePhysics;
    combat: ProjectileCombat;
    effects: ProjectileEffects;
    audio: ProjectileAudio;
}
