/**
 * 遊戲核心類型定義
 * 整合所有遊戲邏輯相關的接口和枚舉
 */

import { RarityType, LevelRequirement } from "../BaseTypes";

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
 * 屬性類型
 */
export type StatType = 'hp' | 'mp' | 'attack' | 'defense' | 'speed' | 'int' | 'agi' | 'str' | 'vit';

/**
 * 英雄屬性加成接口
 */
export interface HeroAttributeBonus {
    // 固定數值加成
    hpBonus?: number;
    attackBonus?: number;
    speedBonus?: number;
    mpBonus?: number;
    defenseBonus?: number;

    // 百分比加成 (0.1 = 10%)
    hpMultiplier?: number;
    attackMultiplier?: number;
    speedMultiplier?: number;
    mpMultiplier?: number;
    defenseMultiplier?: number;

    // 特殊效果
    critRate?: number;
    dodgeRate?: number;
    lifeSteal?: number;
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
