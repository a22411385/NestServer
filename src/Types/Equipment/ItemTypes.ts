
/**
 * 武器配置定義 (從 google-sheets-cache.json 載入)
 */
export interface ItemConfigDefinition {
    id: string;
    name: string;
    type: string;
    description: string;
    baseValue: number;
    rarity: string;
    stackSize: number;
    sellPrice: number;
    category: string;
    usable: boolean;
    effects: string[];
    enabled: boolean;
}