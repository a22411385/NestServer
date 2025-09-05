/**
 * 遊戲核心類型定義
 * 整合所有遊戲邏輯相關的接口和枚舉
 */

/**
 * 單位類型枚舉
 */
export enum UnitType {
    ENEMY = "enemy",
    HERO = "hero",
    SUMMON = "summon",
    BUILDING = "building",
    NPC = "npc",
    BOSS = "boss"
}

/**
 * 遊戲流程狀態類型
 */
export type GameFlowStatus = 'waiting' | 'prepare' | 'battle' | 'rest' | 'settlement' | 'finished';

/**
 * 房間狀態類型  
 */
export type RoomStateType = "waiting" | "playing" | "ended";

/**
 * 玩家數據接口
 */
export interface PlayerData {
    id: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
    characterId: number;
    level: number;
    score: number;
}

/**
 * 遊戲房間選項接口
 */
export interface GameRoomOptions {
    roomName: string;
    maxPlayers: number;
    hostId: string;
    hostName: string;
    hostCharacterId: number;
    roomType?: "normal" | "test";
    isPrivate?: boolean;
}

/**
 * 遊戲時間設定接口
 */
export interface GameTimeSettings {
    prepare: number;    // 準備時間（秒）
    battle: number;     // 戰鬥時間（秒）  
    rest: number;       // 休息時間（秒）
}

/**
 * 角色主屬性類型 - 供玩家配點使用
 */
export type StatType = 'int' | 'agi' | 'str' | 'vit';

/**
 * 統一的屬性加成接口 - 整合裝備與武器的所有屬性加成
 * 支援固定數值和百分比加成
 */
export interface AttributeBonus {
    // === 基礎數值屬性 ===
    hpBonus?: number;           // 生命值固定加成
    mpBonus?: number;           // 魔法值固定加成
    attackBonus?: number;       // 攻擊力固定加成
    defenseBonus?: number;      // 防禦力固定加成
    speedBonus?: number;        // 移動速度固定加成
    attackSpeedBonus?: number;  // 攻擊速度固定加成
    attackRangeBonus?: number;  // 攻擊範圍固定加成

    // === 百分比加成 (0.1 = 10%) ===
    hpMultiplier?: number;
    mpMultiplier?: number;
    attackMultiplier?: number;
    defenseMultiplier?: number;
    speedMultiplier?: number;
    attackSpeedMultiplier?: number;
    attackRangeMultiplier?: number;

    // === 角色主屬性加成 ===
    strengthBonus?: number;     // 力量固定加成
    intelligenceBonus?: number; // 智力固定加成
    vitalityBonus?: number;     // 體力固定加成
    agilityBonus?: number;      // 敏捷固定加成

    strengthMultiplier?: number;     // 力量百分比加成
    intelligenceMultiplier?: number; // 智力百分比加成
    vitalityMultiplier?: number;     // 體力百分比加成
    agilityMultiplier?: number;      // 敏捷百分比加成

    // === 戰鬥特效 ===
    criticalRate?: number;      // 暴擊率 (0-1)
    criticalDamage?: number;    // 暴擊傷害倍率
    dodgeRate?: number;         // 閃避率 (0-1)
    blockRate?: number;         // 格擋率 (0-1)
    lifeSteal?: number;         // 生命偷取 (0-1)
    manaSteal?: number;         // 魔法偷取 (0-1)

    // === 武器專用特效 ===
    pierceCount?: number;       // 穿透次數
    knockbackForce?: number;    // 擊退力量
    areaOfEffect?: number;      // 範圍效果半徑
    chainAttackCount?: number;  // 連鎖攻擊次數
    splashDamageRadius?: number; // 濺射傷害範圍

    // === 輔助武器專用 ===
    healAmount?: number;        // 治療量
    healMultiplier?: number;    // 治療倍率
    buffDuration?: number;      // 增益持續時間
    supportRadius?: number;     // 支援範圍

    // === 抗性屬性 ===
    physicalResistance?: number;  // 物理抗性 (0-1)
    magicalResistance?: number;   // 魔法抗性 (0-1)
    fireResistance?: number;      // 火焰抗性 (0-1) 
    iceResistance?: number;       // 冰霜抗性 (0-1)
    poisonResistance?: number;    // 毒素抗性 (0-1)
    stunResistance?: number;      // 眩暈抗性 (0-1)

    // === 狀態效果觸發機率 ===
    stunChance?: number;        // 眩暈機率 (0-1)
    freezeChance?: number;      // 冰凍機率 (0-1)
    burnChance?: number;        // 燃燒機率 (0-1)
    poisonChance?: number;      // 中毒機率 (0-1)
    slowChance?: number;        // 緩速機率 (0-1)
}

/**
 * Buff 效果接口
 */
export interface BuffEffect {
    id: string;
    type: 'hp_boost' | 'attack_boost' | 'speed_boost' | 'damage_reduction' | 'speed_penalty';
    value: number;
    duration: number;
    remaining: number;
}

/**
 * 遊戲統計接口
 */
export interface GameStats {
    totalKills: number;
    totalDamageDealt: number;
    totalDamageTaken: number;
    survivalTime: number;
    wavesCompleted: number;
}
