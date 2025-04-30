import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    AffixDefinition,
    ConsumableItem,
    EquipmentItem,
    ItemBase,
    PlayerEquipmentData,
    PlayerItem
} from 'src/Game/Item/ItemData';

@Injectable()
export class ItemFactoryService {
    private itemBaseMap: Record<string, ItemBase> = {};
    private equipmentMap: Record<string, EquipmentItem> = {};
    private affixPoolMap: Record<string, AffixDefinition> = {};
    private consumableMap: Record<string, ConsumableItem> = {};

    public InitData(
        items: ItemBase[],
        equip: EquipmentItem[],
        affix: AffixDefinition[],
        consumable: ConsumableItem[]
    ) {
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

    /**
     * 創建一筆物品資料（裝備會附加詞條與耐久）
     */
    public createItem(
        itemId: string,
        options?: {
            level?: number;
            groupId?: string;
        }
    ): {
        playerItem: PlayerItem;
        extraData?: PlayerEquipmentData;
    } {
        const base = this.itemBaseMap[itemId];
        if (!base) throw new Error(`找不到 itemId: ${itemId}`);

        const instanceId = `itm_${randomUUID()}`;
        const now = Date.now();

        const playerItem: PlayerItem = {
            instanceId,
            itemId,
            type: base.Type,
            quantity: 1,
            createdAt: now,
        };

        // ---------- 裝備類處理 ----------
        if (base.Type === 'equipment') {
            const equip = this.equipmentMap[itemId];
            if (!equip) throw new Error(`缺少裝備設定: ${itemId}`);

            const affixes: { key: string; value: number }[] = [];
            const affixPool = [...equip.affixPool];
            const affixCount = equip.affixCount;
            const playerLevel = options?.level || 1;

            for (let i = 0; i < affixCount && affixPool.length > 0; i++) {
                const affixId = this._randomPickWeighted(affixPool);
                if (!affixId) continue;

                const affixDef = this.affixPoolMap[affixId];
                const value = this._generateAffixValue(affixDef, playerLevel);
                affixes.push({ key: affixDef.key, value });

                // 防止重複選
                const idx = affixPool.indexOf(affixId);
                if (idx >= 0) affixPool.splice(idx, 1);
            }

            const durability = this._randomInRange(equip.durability[0], equip.durability[1]);

            const extraData: PlayerEquipmentData = {
                instanceId,
                durability,
                affixes,
            };

            return { playerItem, extraData };
        }

        // ---------- 其他類型道具 ----------
        return { playerItem };
    }

    private _generateAffixValue(affix: AffixDefinition, level: number): number {
        const baseValue = this._randomInRange(affix.min, affix.max);
        const scale = 1 + Math.min(level, 60) * 0.02; // 每級+2%，封頂 60 級
        return Math.floor(baseValue * scale);
    }

    private _randomPickWeighted(pool: string[]): string | null {
        const candidates = pool.map(id => this.affixPoolMap[id]).filter(Boolean);
        const totalWeight = candidates.reduce((sum, affix) => sum + affix.weight, 0);
        if (totalWeight === 0) return null;

        let r = Math.random() * totalWeight;
        for (const affix of candidates) {
            r -= affix.weight;
            if (r <= 0) return affix.affixId;
        }
        return null;
    }

    private _randomInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}