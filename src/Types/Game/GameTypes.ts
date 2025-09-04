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
 * 統一的屬性加成接口 - 合併了所有屬性相關的加成
 */
export interface AttributeBonus {
    // 基礎數值加成
    hpBonus?: number;
    mpBonus?: number;
    attackBonus?: number;
    defenseBonus?: number;
    speedBonus?: number;

    // 百分比加成 (0.1 = 10%)
    hpMultiplier?: number;
    mpMultiplier?: number;
    attackMultiplier?: number;
    defenseMultiplier?: number;
    speedMultiplier?: number;

    // 角色主屬性加成
    intBonus?: number;
    agiBonus?: number;
    strBonus?: number;
    vitBonus?: number;

    // 戰鬥特效
    criticalRate?: number;
    criticalDamage?: number;
    dodgeRate?: number;
    blockRate?: number;
    lifeSteal?: number;
    manaSteal?: number;

    // 抗性
    physicalResistance?: number;
    magicalResistance?: number;
    fireResistance?: number;
    iceResistance?: number;
    poisonResistance?: number;
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
