/**
 * 視覺效果系統類型定義
 * 
 * 用於定義遊戲中所有視覺效果的配置結構
 * 支援配置表驅動的視覺效果系統
 * 
 * @module VisualEffectTypes
 * @since 2.0.0
 */

/**
 * 視覺效果類型
 */
export type VisualEffectType =
    | 'projectile'  // 投射物效果（子彈、箭矢）
    | 'motion'      // 運動效果（擊退、拉扯）
    | 'particle'    // 粒子效果（爆炸、煙霧）
    | 'trail'       // 拖尾效果（軌跡、殘影）
    | 'area'        // 範圍效果（光圈、衝擊波）
    | 'impact';     // 衝擊效果（命中、碰撞）

/**
 * 視覺效果定義（來自 Google Sheets）
 * 
 * 用於配置表驅動的視覺效果系統
 * 
 * @example Google Sheets 表結構
 * ```
 * | effectId          | effectType | primaryColor | secondaryColor | size | glowSize | glowAlpha | particleCount | trailLength | rotationSpeed | hasPulse | sound              | cameraShake |
 * |-------------------|------------|--------------|----------------|------|----------|-----------|---------------|-------------|---------------|----------|--------------------|---------    |
 * | basic_projectile  | projectile | #FFFF00      |                | 8    | 16       | 0.3       | 0             | 5           | 0             | FALSE    | sfx_shoot_basic    | 0           |
 * | fire_explosion    | projectile | #FF4500      | #FFD700        | 12   | 24       | 0.6       | 20            | 8           | 180           | TRUE     | sfx_explosion_fire | 0.3         |
 * | ice_shard         | projectile | #4169E1      | #87CEEB        | 8    | 16       | 0.4       | 10            | 5           | 0             | FALSE    | sfx_ice_launch     | 0.1         |
 * | knockback_swing   | motion     | #FFFFFF      |                | 0    | 0        | 0         | 5             | 0           | 0             | FALSE    | sfx_impact_heavy   | 0.2         |
 * | poison_cloud      | particle   | #32CD32      | #228B22        | 0    | 0        | 0.5       | 30            | 0           | 0             | TRUE     | sfx_poison_hiss    | 0           |
 * ```
 */
export interface VisualEffectDefinition {
    /** 唯一效果 ID（主鍵） */
    effectId: string;

    /** 效果類型 */
    effectType: VisualEffectType;

    /** 主要顏色（16 進位色碼，如 #FF4500） */
    primaryColor: string;

    /** 次要顏色（可選，用於漸變效果） */
    secondaryColor?: string;

    /** 效果大小（像素） */
    size: number;

    /** 光暈大小（像素，0 表示無光暈） */
    glowSize: number;

    /** 光暈透明度（0-1，預設 0.3） */
    glowAlpha?: number;

    /** 粒子數量（0 表示無粒子） */
    particleCount: number;

    /** 拖尾長度（像素，0 表示無拖尾） */
    trailLength: number;

    /** 旋轉速度（度/秒，0 表示不旋轉） */
    rotationSpeed: number;

    /** 是否有脈衝效果（大小變化動畫） */
    hasPulse?: boolean;

    /** 音效 ID（可選） */
    sound?: string;

    /** 相機震動強度（0-1，0 表示無震動） */
    cameraShake?: number;

    /** 持續時間（秒，0 表示無限或由其他系統控制） */
    duration?: number;

    /** 淡出時間（秒，0 表示無淡出） */
    fadeOutDuration?: number;

    /** 自訂標籤（用於特殊邏輯判斷，逗號分隔） */
    tags?: string;

    /** 備註說明（不影響功能） */
    description?: string;

    particleFrequency: number;
    particleSpeedMin: number;
    particleSpeedMax: number;
    particleAlphaStart: number;
    //particleAlphaEnd: number; 永遠是0不用設定

}

/**
 * 視覺效果運行時配置
 * 
 * 用於在運行時動態覆蓋配置表的參數
 * 
 * @example
 * ```typescript
 * const baseConfig = VisualEffectManager.getConfig('fire_explosion');
 * const runtimeConfig: VisualEffectRuntimeConfig = {
 *     scale: 1.5,              // 150% 大小
 *     intensity: 200,          // 擊退力度 200
 *     tint: 0xFF0000,          // 覆蓋顏色為紅色
 * };
 * ```
 */
export interface VisualEffectRuntimeConfig {
    /** 效果縮放（1.0 = 100%，預設使用配置表的值） */
    scale?: number;

    /** 效果強度（用於控制粒子速度、擊退力度等） */
    intensity?: number;

    /** 顏色覆蓋（16 進位色碼） */
    tint?: number;

    /** 持續時間覆蓋（秒） */
    duration?: number;

    /** 目標位置（用於定位效果） */
    targetPosition?: { x: number; y: number };

    /** 方向向量（用於方向性效果） */
    direction?: { x: number; y: number };

    /** 受影響的目標 ID 列表（用於多目標效果） */
    targetIds?: string[];

    /** 自訂數據（用於特殊效果邏輯） */
    customData?: Record<string, any>;
}

/**
 * 客戶端視覺效果配置介面
 * 
 * 用於客戶端投射物和效果渲染
 * 由配置表 + 運行時參數合併而成
 */
export interface ClientVisualEffectConfig {
    /** 主要顏色（數值格式，如 0xFF4500） */
    primaryColor: number;

    /** 次要顏色（可選） */
    secondaryColor?: number;

    /** 大小（像素） */
    size: number;

    /** 是否有光暈 */
    hasGlow?: boolean;

    /** 光暈大小（像素） */
    glowSize?: number;

    /** 光暈透明度（0-1） */
    glowAlpha?: number;

    /** 是否有拖尾 */
    hasTrail?: boolean;

    /** 拖尾顏色（可選，預設使用 primaryColor） */
    trailColor?: number;

    /** 拖尾長度（像素） */
    trailLength?: number;

    /** 旋轉速度（度/秒） */
    rotationSpeed?: number;

    /** 是否有脈衝效果 */
    hasPulse?: boolean;

    /** 粒子效果配置 */
    particles?: {
        color: number;
        count: number;
        speed: number;
    };

    /** 音效 ID */
    sound?: string;

    /** 相機震動強度 */
    cameraShake?: number;
}
