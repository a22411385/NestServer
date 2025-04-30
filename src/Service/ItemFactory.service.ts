import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AffixDefinition, ConsumableItem, EquipmentItem, ItemBase, PlayerEquipmentData, PlayerItem } from 'src/Game/Item/ItemData';

@Injectable()
export class ItemFactoryService {
    private itemBaseMap: Record<string, ItemBase>
    private equipmentMap: Record<string, EquipmentItem>
    private affixPoolMap: Record<string, AffixDefinition>
    private consumableMap: Record<string, ConsumableItem>
    public InitData(items: ItemBase[], equip: EquipmentItem[], affix: AffixDefinition[], consumable: ConsumableItem[]) {

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

    createItem(itemId: string, quantity = 1): {
        playerItem: PlayerItem;
        extraData?: PlayerEquipmentData;
    } {
        const base = this.itemBaseMap[itemId];
        if (!base) throw new Error(`Item not found: ${itemId}`);

        const instanceId = `itm_${randomUUID()}`;

        const playerItem: PlayerItem = {
            instanceId,
            itemId,
            type: base.Type,
            quantity,
            createdAt: Date.now(),
        };

        if (base.Type === 'equipment') {
            const equip = this.equipmentMap[itemId];
            if (!equip) throw new Error(`Equipment data missing for: ${itemId}`);

            // 隨機選 affixCount 個 affixId
            const affixIds = this._randomWeightedChoice(
                equip.affixPool,
                equip.affixCount
            );

            const affixes = affixIds.map((affixId) => {
                const affix = this.affixPoolMap[affixId];
                const value = this._randomInRange(affix.min, affix.max);
                return {
                    key: affix.key,
                    value,
                };
            });

            const durability = this._randomInRange(
                equip.durability[0],
                equip.durability[1]
            );

            return {
                playerItem,
                extraData: {
                    instanceId,
                    durability,
                    affixes,
                },
            };
        }

        // 非裝備回傳單純 playerItem
        return { playerItem };
    }

    private _randomInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private _randomWeightedChoice(pool: string[], count: number): string[] {
        const affixes: AffixDefinition[] = pool
            .map((id) => this.affixPoolMap[id])
            .filter((a) => !!a);

        const result: string[] = [];
        while (result.length < count && affixes.length > 0) {
            const totalWeight = affixes.reduce((sum, a) => sum + a.weight, 0);
            const r = Math.random() * totalWeight;
            let acc = 0;

            for (let i = 0; i < affixes.length; i++) {
                acc += affixes[i].weight;
                if (r <= acc) {
                    result.push(affixes[i].affixId);
                    affixes.splice(i, 1); // 移除已抽取
                    break;
                }
            }
        }

        return result;
    }
}