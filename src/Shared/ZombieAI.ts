import seedrandom from 'seedrandom';

export type ZombieState = 'Idle' | 'Wander' | 'Aggro';

export interface ZombieDecision {
    state: ZombieState;
    targetPos?: { x: number, y: number };
}

export class ZombieAI {
    private rng: seedrandom.PRNG;
    private state: ZombieState = 'Idle';
    private stateUntil = 0;

    constructor(seed: string) {
        this.rng = seedrandom(seed);
    }

    /** 進入戰鬥模式 */
    enterAggro(): ZombieDecision {
        this.state = 'Aggro';
        return { state: 'Aggro' };
    }

    /**
     * 在無目標時呼叫，會根據 internal 狀態回傳目前要幹嘛
     */
    update(currentTime: number, currentPos: { x: number, y: number }): ZombieDecision {
        // 若還在同一狀態時間內，繼續維持
        if (currentTime < this.stateUntil) {
            return this.getCurrentState(currentPos);
        }

        // 時間到了：決定新的狀態
        const roll = this.rng(); // 0~1
        if (roll < 0.4) {
            // 進入 Idle（發呆）狀態：5~8秒
            this.state = 'Idle';
            const idleTime = 5 + this.rng() * 3;
            this.stateUntil = currentTime + idleTime;
            return { state: 'Idle' };
        } else {
            // 進入 Wander 狀態：前往新座標（這邊可根據地圖邏輯生成目標點）
            this.state = 'Wander';
            this.stateUntil = currentTime + 4; // wander 4 秒後再決定下一次
            const offsetX = (this.rng() - 0.5) * 200;
            const offsetY = (this.rng() - 0.5) * 200;
            return {
                state: 'Wander',
                targetPos: {
                    x: currentPos.x + offsetX,
                    y: currentPos.y + offsetY
                }
            };
        }
    }

    private getCurrentState(currentPos: { x: number, y: number }): ZombieDecision {
        if (this.state === 'Idle') {
            return { state: 'Idle' };
        }
        if (this.state === 'Wander') {
            // 保持前往先前目標，這裡可進一步加上目標記錄
            return { state: 'Wander' }; // 呼叫者要自己保留目標
        }
        return { state: 'Aggro' };
    }
}