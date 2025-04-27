interface CombatState {
    hp: number;
    maxHp: number;
    attackInterval: number; // 秒
    lastAttackTime: number; // 秒
    skills: SkillInstance[]; // 持有技能
    statuses: StatusEffect[]; // 異常狀態
    isDead: boolean;
}

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