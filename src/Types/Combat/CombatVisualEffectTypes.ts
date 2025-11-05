/**
 * 戰鬥視覺效果類型定義
 * 
 * 用於定義 CombatSystem.generateVisualEffects() 方法產生的視覺效果數據結構
 * 這些類型確保服務端和客戶端之間的視覺效果數據一致性
 */

/**
 * 基礎視覺效果接口
 */
export interface BaseVisualEffect {
    /** 效果類型 - 對應客戶端 VisualEffectManager 的效果類型 */
    type: 'motion' | 'trail' | 'particle' | 'impact' | 'projectile' | 'area';
    /** 標籤資訊 - 來自武器詞綴，用於客戶端效果匹配 */
    tags: string;
    /** 效果位置 - 世界座標 */
    position?: { x: number; y: number };
    /** 方向向量 - 歸一化的方向 */
    direction?: { x: number; y: number };
}

/**
 * 運動類視覺效果（揮擊、擊退）
 * 
 * 適用場景：
 * - 近戰武器揮擊扇形攻擊
 * - 擊退效果的力量表現
 * - 衝刺、躍擊等運動技能
 */
export interface MotionVisualEffect extends BaseVisualEffect {
    type: 'motion';
    /** 目標ID（用於擊退等單體運動效果） */
    targetId?: string;
    /** 效果數值（如擊退力量、衝刺距離） */
    value?: number;
    /** 額外數據 */
    data?: {
        /** 揮擊角度（度） */
        sweepAngle?: number;
        /** 攻擊範圍 */
        range?: number;
        /** 武器類型（用於選擇對應的視覺效果） */
        weaponType?: string;
    };
}

/**
 * 軌跡類視覺效果（穿透、連鎖）
 * 
 * 適用場景：
 * - 投射物穿透多個目標
 * - 閃電連鎖攻擊
 * - 彈跳攻擊軌跡
 */
export interface TrailVisualEffect extends BaseVisualEffect {
    type: 'trail';
    /** 目標ID列表（穿透軌跡） */
    targetIds?: string[];
    /** 穿透數量 */
    pierceCount?: number;
    /** 連鎖路徑 - 按攻擊順序排列的目標位置 */
    chainPath?: Array<{ x: number; y: number; targetId: string } | null>;
    /** 連鎖數量 */
    chainCount?: number;
}

/**
 * 粒子類視覺效果（爆炸、範圍）
 * 
 * 適用場景：
 * - 範圍攻擊的爆炸效果
 * - 元素效果的粒子表現
 * - 狀態效果的環形擴散
 */
export interface ParticleVisualEffect extends BaseVisualEffect {
    type: 'particle';
    /** 效果半徑 */
    radius?: number;
    /** 受影響的目標ID列表 */
    affectedTargets?: string[];
    /** 粒子數量（可選，用於調整效果強度） */
    particleCount?: number;
    /** 元素類型（可選，用於顏色和效果選擇） */
    elementType?: 'fire' | 'ice' | 'lightning' | 'poison' | 'physical' | 'holy' | 'shadow';
}

/**
 * 衝擊類視覺效果（擊中瞬間）
 * 
 * 適用場景：
 * - 武器擊中目標的瞬間效果
 * - 暴擊的特殊表現
 * - 護盾破碎等瞬間事件
 */
export interface ImpactVisualEffect extends BaseVisualEffect {
    type: 'impact';
    /** 目標ID */
    targetId: string;
    /** 是否為暴擊 */
    isCritical?: boolean;
    /** 傷害數值（用於傷害數字顯示） */
    damage?: number;
    /** 傷害類型 */
    damageType?: 'physical' | 'magic' | 'elemental';
}

/**
 * 投射物類視覺效果
 * 
 * 適用場景：
 * - 弓箭、法術投射物
 * - 投擲武器軌跡
 * - 延遲爆炸的投射物
 */
export interface ProjectileVisualEffect extends BaseVisualEffect {
    type: 'projectile';
    /** 起始位置 */
    startPosition: { x: number; y: number };
    /** 目標位置 */
    targetPosition: { x: number; y: number };
    /** 飛行速度 */
    speed?: number;
    /** 投射物外觀類型 */
    projectileType?: string;
    /** 是否有拖尾效果 */
    hasTrail?: boolean;
}

/**
 * 區域類視覺效果
 * 
 * 適用場景：
 * - 持續性的區域效果（毒雲、火海）
 * - 警告區域標示
 * - 範圍增益/減益效果
 */
export interface AreaVisualEffect extends BaseVisualEffect {
    type: 'area';
    /** 區域半徑 */
    radius: number;
    /** 持續時間（毫秒） */
    duration?: number;
    /** 是否為持續效果 */
    isPersistent?: boolean;
    /** 區域效果類型 */
    areaType?: 'damage' | 'healing' | 'buff' | 'debuff' | 'warning';
}

/**
 * 戰鬥視覺效果聯合類型
 * 
 * 這是 CombatSystem.generateVisualEffects() 方法的返回類型
 */
export type CombatVisualEffect =
    | MotionVisualEffect
    | TrailVisualEffect
    | ParticleVisualEffect
    | ImpactVisualEffect
    | ProjectileVisualEffect
    | AreaVisualEffect;

/**
 * 視覺效果嚴重程度
 * 用於客戶端效果強度調整
 */
export enum VisualEffectSeverity {
    LOW = 'low',           // 輕微效果
    NORMAL = 'normal',     // 普通效果
    HIGH = 'high',         // 強烈效果
    CRITICAL = 'critical'  // 暴擊或特殊效果
}

