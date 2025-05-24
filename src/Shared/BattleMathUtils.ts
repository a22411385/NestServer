// src/Shared/BattleMathUtils.ts

import seedrandom from 'seedrandom';

export namespace BattleMathUtils {

    let rng: seedrandom.PRNG = seedrandom();

    /**
     * 設定隨機種子（server 同步至所有 client）
     */
    export function setSeed(seed: string | number) {
        rng = seedrandom(seed.toString());
    }

    /**
     * 根據方向與速度移動單位（回傳新座標）
     * @param x 當前X
     * @param y 當前Y
     * @param angle 朝向角度（以弧度為單位）
     * @param speed 每秒移動距離
     * @param deltaSec 本次更新秒數
     */
    export function move(x: number, y: number, angle: number, speed: number, deltaSec: number): { x: number, y: number } {
        return {
            x: x + Math.cos(angle) * speed * deltaSec,
            y: y + Math.sin(angle) * speed * deltaSec
        };
    }

    /**
     * 彈道計算：起點到終點所需時間與角度
     */
    export function computeProjectile(from: { x: number, y: number }, to: { x: number, y: number }, speed: number): { angle: number, time: number } {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return {
            angle: Math.atan2(dy, dx),
            time: dist / speed
        };
    }

    /**
     * 圓形碰撞檢查（基於半徑）
     */
    export function isCollide(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
        const dx = ax - bx;
        const dy = ay - by;
        const distSq = dx * dx + dy * dy;
        const r = ar + br;
        return distSq < r * r;
    }

    /**
     * 隨機整數（含 min, max）
     */
    export function randInt(min: number, max: number): number {
        return Math.floor(rng() * (max - min + 1)) + min;
    }

    /**
     * 隨機小數（含 min, 不含 max）
     */
    export function randFloat(min: number, max: number): number {
        return rng() * (max - min) + min;
    }

    /**
     * 擲骰：隨機從陣列中挑一個值
     */
    export function pick<T>(list: T[]): T {
        return list[Math.floor(rng() * list.length)];
    }

}
