export enum 職業種類 {

    平民 = 'commoner',
    戰士 = 'warrior',
    法師 = 'mage',
    盜賊 = 'rogue',
    牧師 = 'priest',
}

export enum 傷害類型 {

    物理 = 0,
    魔法 = 1,
    真實 = 2,

}

export enum PlayerGameState {

    IDLE = "idle",
    DEAD = "dead",
    WAITING = "waiting",
    READY = "ready",
    FIGHTING = "fighting",


}
export enum BattleEventType {
    同步位置 = 'sync.allUnitPos',

    MonsterSpawn = 'MonsterSpawn',
    UnitMove = 'UnitMove',
    Attack = 'attack',
    Damage = 'damage',
    Death = 'death',
    Heal = 'heal',
    Init = "init",
    GameOver = 'game_over',

}
export enum ClientCommandType {
    MovePlayer = 'move_player',
}



export interface BattleEvent<T = any> {
    type: BattleEventType;
    payload: T;              // 具體資料
}

// Attack 事件的 payload
export interface AttackPayload {
    attackerId: string;
    targetId: string;
    skillId?: string;
}

// Damage 事件的 payload
export interface DamagePayload {
    targetId: string;
    amount: number;
    damageType: 傷害類型;
}
export const ITEM_RATES = ['common', 'uncommon', 'rate', 'epic', 'legend'] as const;
export type ITEM_RATE = typeof ITEM_RATES[number];

export const enum ITEM_TYPE {

    equipment = 'equipment',
    consumable = 'consumable',
    junk = 'junk',
    currency = 'currency'

}

export const enum EQUIP_VERSION {


    normal = 'normal',
    superior = 'superior',
    exceptional = 'exceptional',
    elite = 'elite'

}



export type MonsterKind = 'normal' | 'elite' | 'boss';
// Death 事件的 payload
export interface DeathPayload {
    targetId: string;
    lv: number;
    type: MonsterKind
}