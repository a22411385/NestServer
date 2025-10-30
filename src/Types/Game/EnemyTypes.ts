/**
 * 敵人系統類型定義
 * 整合自 EnemyFactory.ts 的所有接口和枚舉
 */

/** 敵人分類 */
export type EnemyCategory = 'undead' | 'beast' | 'demon' | 'humanoid' | 'elemental' | 'construct';

/**
 * AI 類型
 */
export type EnemyAIType =
    | 'aggressive'  // 主動攻擊，直接沖向玩家
    | 'defensive'   // 防禦型，保持距離
    | 'chase'       // 追擊型，高速追逐
    | 'tank'        // 肉盾型，緩慢但堅固
    | 'ranged'      // 遠程攻擊
    | 'boss'        // Boss 行為
    | 'elite'       // 精英怪行為
    | 'ambush'      // 伏擊型
    | 'summoner'    // 召喚師
    | 'phantom';    // 幽靈型（可穿牆）

/**
 * 🆕 敵人配置定義（從 Google Sheets 載入）
 */
export interface EnemyConfigDefinition {
    id: string;                      // 敵人ID（唯一標識）
    name: string;                    // 內部名稱
    displayName: string;             // 顯示名稱模板（支持 {wave} 變數）
    description: string;             // 描述
    category: EnemyCategory;         // 分類

    // 基礎屬性
    baseHp: number;                  // 基礎生命值
    baseAttackDamage: number;        // 基礎攻擊力
    baseMoveSpeed: number;           // 基礎移動速度
    baseExpReward: number;           // 基礎經驗獎勵
    baseGoldReward: number;          // 基礎金幣獎勵

    // 視覺屬性
    scale: number;                   // 縮放比例
    collisionWidth: number;          // 碰撞寬度
    collisionHeight: number;         // 碰撞高度
    iconPath: string;                // 圖標路徑
    modelPath: string;               // 模型/動畫路徑

    // AI 行為
    aiType: EnemyAIType;            // AI 類型

    // 生成控制
    spawnWeight: number;             // 生成權重（越高越常出現）
    minWave: number;                 // 最小出現波次
    maxWave: number;                 // 最大出現波次（0 = 無限制）

    // 特殊能力
    specialAbilities: string;        // 特殊能力（逗號分隔）

    enabled: boolean;                // 是否啟用
}
/**
 * 敵人AI狀態枚舉
 */
export enum EnemyAIState {
    IDLE = "idle",
    PATROL = "patrol",
    CHASE = "chase",
    ATTACK = "attack",
    RETREAT = "retreat",
    DEAD = "dead"
}

