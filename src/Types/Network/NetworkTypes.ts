/**
 * 網路通信類型定義
 * 整合所有網路相關的接口和類型
 */

/**
 * 玩家信息接口
 */
export interface PlayerInfo {
    id: string;
    name: string;
    characterId: number;
    isReady: boolean;
    isHost: boolean;
    level?: number;
    avatar?: string;
}

/**
 * 遊戲狀態數據接口
 */
export interface GameStateData {
    roomName: string;
    maxPlayers: number;
    gameState: "waiting" | "preparing" | "playing" | "finished";
    gameTime: number;
    isStarted: boolean;
    waveNumber: number;
    zombieCount: number;
    totalZombies: number;
    players: Record<string, PlayerInfo>;
}

/**
 * WebSocket 消息類型枚舉
 */
export enum MessageType {
    // 連接相關
    JOIN_ROOM = "join_room",
    LEAVE_ROOM = "leave_room",
    PLAYER_READY = "player_ready",

    // 遊戲控制
    START_GAME = "start_game",
    END_GAME = "end_game",
    PAUSE_GAME = "pause_game",

    // 移動相關
    PLAYER_MOVE = "player_move",
    UNIT_POSITION = "unit_position",

    // 戰鬥相關
    ATTACK = "attack",
    DAMAGE = "damage",
    HEAL = "heal",

    // 裝備相關
    EQUIP_ITEM = "equip_item",
    UNEQUIP_ITEM = "unequip_item",
    USE_ITEM = "use_item",

    // 系統消息
    SYSTEM_MESSAGE = "system_message",
    ERROR_MESSAGE = "error_message",

    // 測試相關
    DEBUG_COMMAND = "debug_command",
    TEST_COMMAND = "test_command"
}

/**
 * 基礎消息接口
 */
export interface BaseMessage {
    type: MessageType;
    timestamp: number;
    playerId?: string;
}

/**
 * 移動消息接口
 */
export interface MoveMessage extends BaseMessage {
    type: MessageType.PLAYER_MOVE;
    position: {
        x: number;
        y: number;
    };
    direction?: number;
    speed?: number;
}

/**
 * 攻擊消息接口
 */
export interface AttackMessage extends BaseMessage {
    type: MessageType.ATTACK;
    targetId: string;
    weaponId?: string;
    attackType?: 'normal' | 'special' | 'critical';
}

/**
 * 裝備消息接口
 */
export interface EquipMessage extends BaseMessage {
    type: MessageType.EQUIP_ITEM | MessageType.UNEQUIP_ITEM;
    itemId: string;
    slotIndex?: number;
}

/**
 * 系統消息接口
 */
export interface SystemMessage extends BaseMessage {
    type: MessageType.SYSTEM_MESSAGE | MessageType.ERROR_MESSAGE;
    message: string;
    level: 'info' | 'warning' | 'error' | 'success';
}

/**
 * 調試命令接口
 */
export interface DebugMessage extends BaseMessage {
    type: MessageType.DEBUG_COMMAND | MessageType.TEST_COMMAND;
    command: string;
    args?: any[];
}

/**
 * 消息處理結果接口
 */
export interface MessageHandleResult {
    success: boolean;
    message?: string;
    data?: any;
    shouldBroadcast?: boolean;
    targetClients?: string[];
}

/**
 * 房間事件接口
 */
export interface RoomEvent {
    type: string;
    roomId: string;
    data: any;
    timestamp: number;
}

/**
 * 連接狀態接口
 */
export interface ConnectionStatus {
    isConnected: boolean;
    connectionTime: number;
    lastPingTime: number;
    latency: number;
    reconnectAttempts: number;
}
