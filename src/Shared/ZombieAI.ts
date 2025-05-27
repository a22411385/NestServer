import seedrandom from 'seedrandom';
import { BattleMathUtils, type Vector2 } from './BattleMathUtils';

export type ZombieState = 'Idle' | 'Wander' | 'Aggro';

export interface ZombieDecision {
    state: ZombieState;
    targetPos?: { x: number, y: number };
}

export class ZombieAI {
    private rng: seedrandom.PRNG;
    private state: ZombieState = 'Idle';
    private stateUntil = 0;

    isNewState: boolean = false; // 是否是新狀態
    //想要去的地方
    private moveDir: { x: number, y: number };
    constructor(seed: string) {
        this.rng = seedrandom(seed);
        this.moveDir = { x: 0, y: 0 }
    }


    閒晃(currentTime: number, pos: Vector2): ZombieDecision {

        const nextPos = BattleMathUtils.getRandomPointInCircle(pos.x, pos.y, 50, Date.now().toString());
        //console.log('開始閒晃', nextPos)
        this.state = 'Wander';
        //秒數
        const walkTime = Math.floor(2 + this.rng() * 3);
        // console.log(`走${walkTime}秒`);
        //秒數需要乘上毫秒
        this.stateUntil = currentTime + (walkTime * 1000);

        //這裡應該要回一個向量
        // ✅ 回傳方向向量
        const dx = nextPos.x - pos.x;
        const dy = nextPos.y - pos.y;
        const dist = Math.hypot(dx, dy);
        this.moveDir = { x: Number((dx / dist).toFixed(4)), y: Number((dy / dist).toFixed(4)) }
        return {
            state: this.state,
            targetPos: this.moveDir,
        };
    }
    待機(currentTime: number): ZombieDecision {
        // console.log('待機')
        this.state = 'Idle';
        const idleTime = 5 + this.rng() * 3;
        this.stateUntil = currentTime + (idleTime * 1000);
        return { state: this.state };
    }

    /**
     * 在無目標時呼叫，會根據 internal 狀態回傳目前要幹嘛
     */
    update(currentTime: number, currentPos: Vector2): ZombieDecision {
        // 若還在同一狀態時間內，繼續維持
        if (currentTime < this.stateUntil) {

            if (this.state == 'Wander') {
                return {
                    state: this.state,
                    targetPos: this.moveDir
                };
            } else {
                return { state: this.state };

            }
        }

        //換狀態
        const roll = this.rng();
        this.isNewState = true;
        return roll < 0.4
            ? this.待機(currentTime)
            : this.閒晃(currentTime, currentPos);

    }
}