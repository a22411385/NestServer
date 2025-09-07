// src/Shared/BattleMathUtils.ts

import seedrandom from 'seedrandom';
import { Vector2 } from "@/Types";

export type Int = number & { __int__: void };
// Vector2 interface 已移動到 Types 資料夾
export function toInt(n: number): Int {
    return Number((n).toFixed(2)) as Int;
}
export function* mergeMaps<K, V>(...maps: Map<K, V>[]): Generator<[K, V]> {
    for (const map of maps) {
        for (const [key, value] of map) {
            yield [key, value];
        }
    }
}

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
     * 矩形碰撞檢查（基於 AABB - Axis-Aligned Bounding Box）
     */
    export function isRectCollide(
        ax: number, ay: number, aw: number, ah: number,
        bx: number, by: number, bw: number, bh: number
    ): boolean {
        // 計算每個矩形的邊界
        const aLeft = ax - aw / 2;
        const aRight = ax + aw / 2;
        const aTop = ay - ah / 2;
        const aBottom = ay + ah / 2;

        const bLeft = bx - bw / 2;
        const bRight = bx + bw / 2;
        const bTop = by - bh / 2;
        const bBottom = by + bh / 2;

        // AABB 碰撞檢測
        return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom);
    }

    /**
     * 混合碰撞檢查：圓形與矩形碰撞
     */
    export function isCircleRectCollide(
        cx: number, cy: number, radius: number,
        rx: number, ry: number, width: number, height: number
    ): boolean {
        // 找到矩形上離圓心最近的點
        const halfW = width / 2;
        const halfH = height / 2;

        const closestX = Math.max(rx - halfW, Math.min(cx, rx + halfW));
        const closestY = Math.max(ry - halfH, Math.min(cy, ry + halfH));

        // 計算圓心到最近點的距離
        const dx = cx - closestX;
        const dy = cy - closestY;
        const distanceSq = dx * dx + dy * dy;

        return distanceSq <= radius * radius;
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

    //取得半徑內任何一個點
    export function getRandomPointInCircle(cx: number, cy: number, radius: number, seed: string): Vector2 {
        const rng = seedrandom(seed);

        // 隨機角度（0 到 2π）
        const angle = rng() * Math.PI * 2;

        // 隨機半徑，需做平方根來保證均勻分布
        const r = Math.sqrt(rng()) * radius;

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        return { x: toInt(x), y: toInt(y) };
    }

    /**
     * 計算兩點之間的距離（使用 Math.hypot 優化性能）
     */
    export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.hypot(x2 - x1, y2 - y1);
    }

    /**
     * 計算兩個位置對象之間的距離
     */
    export function calculateDistanceVector(pos1: { x: number, y: number }, pos2: { x: number, y: number }): number {
        return calculateDistance(pos1.x, pos1.y, pos2.x, pos2.y);
    }

    /**
     * 將數值限制在指定範圍內（邊界限制）
     */
    export function clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 檢查位置是否在地圖邊界內
     */
    export function isWithinMapBounds(x: number, y: number, mapWidth: number, mapHeight: number): boolean {
        const halfWidth = mapWidth / 2;
        const halfHeight = mapHeight / 2;
        return x >= -halfWidth && x <= halfWidth && y >= -halfHeight && y <= halfHeight;
    }

    /**
     * 將位置限制在地圖邊界內
     */
    export function clampToMapBounds(position: { x: number, y: number }, mapWidth: number, mapHeight: number): { x: number, y: number } {
        const halfWidth = mapWidth / 2;
        const halfHeight = mapHeight / 2;
        return {
            x: clamp(position.x, -halfWidth, halfWidth),
            y: clamp(position.y, -halfHeight, halfHeight)
        };
    }

    /**
     * 隨機範圍內的整數（包含 min 和 max）
     */
    export function randomIntRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 隨機範圍內的浮點數（包含 min，不包含 max）
     */
    export function randomFloatRange(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    /**
     * 基於概率的隨機判斷
     */
    export function rollProbability(probability: number): boolean {
        return Math.random() < probability;
    }

    /**
     * 隨機偏移量生成器
     */
    export function getRandomOffset(range: number = 50): { x: number, y: number } {
        return {
            x: randomFloatRange(-range, range),
            y: randomFloatRange(-range, range)
        };
    }

    /**
     * 將值限制為最小值（確保不小於指定值）
     */
    export function atLeast(value: number, minimum: number): number {
        return Math.max(value, minimum);
    }

    /**
     * 將值限制為最大值（確保不大於指定值）
     */
    export function atMost(value: number, maximum: number): number {
        return Math.min(value, maximum);
    }

    /**
     * 計算百分比
     */
    export function percentage(value: number, total: number): number {
        return total === 0 ? 0 : (value / total) * 100;
    }

    /**
     * 從百分比計算實際值
     */
    export function fromPercentage(percentage: number, total: number): number {
        return (percentage / 100) * total;
    }

    /**
     * 線性插值
     */
    export function lerp(start: number, end: number, factor: number): number {
        return start + (end - start) * clamp(factor, 0, 1);
    }

    /**
     * 反向線性插值（計算因子）
     */
    export function inverseLerp(start: number, end: number, value: number): number {
        return end === start ? 0 : clamp((value - start) / (end - start), 0, 1);
    }
}