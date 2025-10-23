import { PropertyValue, StatusEffectConfig } from "@/Types";

export function createEffectFromProperty(prop: PropertyValue): StatusEffectConfig | null {
    switch (prop.type) {
        // case 'stun':
        // case 'freeze':
        // case "slow":
        //     return CommonEffect(prop);
        // 其他效果類型的處理邏輯可以在此添加
        default:
            return CommonEffect(prop);
    }

}

// class EffectsParser {

//     constructor()


// }

function CommonEffect(prop: PropertyValue): StatusEffectConfig | null {
    //複合類型
    return {
        category: prop.category,
        type: prop.type,
        chance: prop.probability,
        duration: prop.duration * 1000, // 轉換為毫秒
        value: typeof prop.value === 'number' ? prop.value : undefined,
    };
}
