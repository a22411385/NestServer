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