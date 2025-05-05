// ----------------------------------------------------------
// item-factory.service.ts  （僅示範新增內容，保留你的 InitData）
// ----------------------------------------------------------
import { Injectable } from '@nestjs/common';
import { randomUUID, randomInt } from 'crypto';
import {
    ItemBase, EquipmentItem, AffixDefinition, ConsumableItem,
    PlayerItem, PlayerEquipmentData,
    MainGroupData,
    GroupEntrieData
} from 'src/Game/Item/ItemData';

export type MonsterKind = 'normal' | 'elite' | 'boss';
export interface DropOptions { kind: MonsterKind; level: number; }

@Injectable()
export class ItemFactoryService {
    private itemBaseMap: Record<string, ItemBase> = {};
    private equipmentMap: Record<string, EquipmentItem> = {};
    private affixPoolMap: Record<string, AffixDefinition> = {};
    private consumableMap: Record<string, ConsumableItem> = {};
    private mainGroups: MainGroupData[] = [];
    private groupEntries: GroupEntrieData[] = [];

    public InitData(
        items: ItemBase[],
        equip: EquipmentItem[],
        affix: AffixDefinition[],
        consumable: ConsumableItem[],
        mainGroups: MainGroupData[],
        groupEntries: GroupEntrieData[]
    ) {
        this.mainGroups = mainGroups;
        this.groupEntries = groupEntries;
        items.forEach(item => {
            this.itemBaseMap[item.ItemId] = item;
        });
        equip.forEach(item => {
            this.equipmentMap[item.itemId] = item;
        });
        affix.forEach(item => {
            this.affixPoolMap[item.affixId] = item;
        });
        consumable.forEach(item => {
            this.consumableMap[item.itemId] = item;
        });

        console.log('✅ 物品系統初始化 完成');
    }

    /** ===== 產生玩家實體掉落 ===== */
    public generateDrops(opts: DropOptions): (PlayerItem | PlayerEquipmentData)[] {
        const mainId = this.kindToMainGroup(opts.kind);
        const main = this.mainGroups.find(g => g.groupId === mainId);
        if (!main) return [];

        const drops: (PlayerItem | PlayerEquipmentData)[] = [];

        for (let i = 0; i < main.rolls; i++) {
            const entry = this.pickWeighted(mainId);
            this.resolveEntry(entry, opts, drops);
        }
        return drops;
    }

    // ---------- 私有：遞迴解析 ----------
    private resolveEntry(entry: GroupEntrieData, opts: DropOptions, outArr: any) {
        const qtyRnd = randomInt(entry.qtyMin, entry.qtyMax + 1);

        if (entry.refType === 'group') {
            for (let i = 0; i < qtyRnd; i++) {
                const sub = entry.weight === -1                     // 金幣等必掉子群組
                    ? entry
                    : this.pickWeighted(entry.refId);
                this.resolveEntry(sub, opts, outArr);
            }
            return;
        }

        // ------------------ item ------------------
        if (entry.refId === 'currency_gold') {
            outArr.push({
                instanceId: randomUUID(),
                itemId: 'currency_gold',
                type: 'currency',
                quantity: qtyRnd,
                createdAt: Date.now()
            } as PlayerItem);
            return;
        }

        const base = this.itemBaseMap[entry.refId];
        if (!base) return;

        // ===== 普通物品（垃圾 / 材料 / 藥水 …）=====
        if (base.Type !== 'equipment') {
            outArr.push({
                instanceId: randomUUID(),
                itemId: base.ItemId,
                type: base.Type,
                quantity: qtyRnd,
                createdAt: Date.now()
            } as PlayerItem);
            return;
        }

        // ===== 裝備 =====
        const equipMeta = this.equipmentMap[base.ItemId];
        const rate = this.rollQuality(opts.kind);
        const affixCount = this.affixCountByRate(rate);
        const affixes = rate === 'legend'
            ? this.buildLegendAffixes(base.ItemId)
            : this.buildRandomAffixes(equipMeta, affixCount, opts.level);

        outArr.push({
            instanceId: randomUUID(),
            itemId: base.ItemId,
            type: 'equipment',
            quantity: 1,
            createdAt: Date.now()
        } as PlayerItem);

        outArr.push({
            instanceId: randomUUID(),          // 與 PlayerItem 可共用同一 UUID
            durability: equipMeta.durability[1],
            affixes                                  // [{ key:'str', value:12 }, …]
        } as PlayerEquipmentData);
    }

    // ---------- 抽 affix ----------
    private buildRandomAffixes(meta: EquipmentItem, n: number, level: number) {
        if (n === 0) return [];

        const tier = Math.max(1, Math.ceil(level / 10));     // 1‑60 → T1‑T6
        const pool = meta.affixPool.filter(id => id.endsWith('_T' + tier));
        const picks: AffixDefinition[] = [];

        while (picks.length < n && pool.length) {
            const idx = randomInt(0, pool.length);
            picks.push(this.affixPoolMap[pool.splice(idx, 1)[0]]);
        }

        const coef = [0, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4][tier];   // T1‑T6
        return picks.map(p => ({
            key: p.key,
            value: Math.round(randomInt(p.min, p.max + 1) * coef)
        }));
    }

    private buildLegendAffixes(itemId: string) {
        // TODO: 改成讀唯一裝表；示意固定 affix
        return [{ key: 'legendaryPower', value: 1 }];
    }

    // ---------- 工具 ----------
    private pickWeighted(groupId: string) {
        const list = this.groupEntries.filter(e => e.groupId === groupId && e.weight > 0);
        const sum = list.reduce((a, e) => a + e.weight, 0);
        let roll = Math.random() * sum;
        for (const e of list) if ((roll -= e.weight) <= 0) return e;
        return list[list.length - 1];
    }

    private kindToMainGroup(k: MonsterKind) {
        return k === 'normal' ? 'Mob_Normal' : k === 'elite' ? 'Mob_Elite' : 'Mob_Boss';
    }

    private rollQuality(k: MonsterKind) {
        const tbl = {
            normal: [65, 25, 9, 1, 0.05],
            elite: [30, 35, 25, 9.5, 0.5],
            boss: [0, 0, 0, 95, 5]
        }[k];
        const names = ['common', 'uncommon', 'rare', 'epic', 'legend'];
        let r = Math.random() * 100;
        for (let i = 0; i < tbl.length; i++) if ((r -= tbl[i]) <= 0) return names[i];
        return 'common';
    }

    private affixCountByRate(rate: string) {
        return { uncommon: 2, rare: 3, epic: 4 }[rate] ?? 0;
    }
}