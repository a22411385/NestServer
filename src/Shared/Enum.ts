export enum 職業種類 {

    平民 = 0,
    戰士 = 1,
    法師 = 2,
    盜賊 = 3,
    牧師 = 4,
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
    Attack = 'attack',
    Damage = 'damage',
    Death = 'death',
    Heal = 'heal',

}

export interface BattleEvent<T = any> {
    type: BattleEventType;
    timestamp: number;       // 事件時間戳
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