import { MonsterKind } from "src/Shared/Enum";

interface SkillInstance {
    id: string;
    name: string;
    cooldown: number; // 秒
    lastUsedTime: number; // 秒
}

interface StatusEffect {
    id: string;
    type: 'stun' | 'freeze' | 'silence';
    expiresAt: number; // 秒
}

export interface KillInfo {

    lv: number;
    type: MonsterKind;
    uniqueID: string;


}
export enum 攻擊結果 {

    迴避,
    目標被擊殺,
    命中,
    失敗


}