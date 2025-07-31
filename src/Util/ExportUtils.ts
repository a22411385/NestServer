const hiddenFields = new WeakMap<any, Set<string>>();

export function Hide() {
    return function (target: any, propertyKey: string) {
        const proto = target;
        if (!hiddenFields.has(proto)) {
            hiddenFields.set(proto, new Set());
        }
        hiddenFields.get(proto)!.add(propertyKey);
    };
}

function shouldIncludeKey(obj: any, key: string): boolean {
    if (key.startsWith('_') || key === 'constructor') return false;
    const proto = Object.getPrototypeOf(obj);
    const hidden = hiddenFields.get(proto);
    return !hidden?.has(key);
}

export function toPublicJSON(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(toPublicJSON);
    }

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const result: Record<string, any> = {};

    for (const key of Object.keys(obj)) {
        if (shouldIncludeKey(obj, key)) {
            const val = obj[key];
            if (typeof val !== 'function') {
                result[key] = toPublicJSON(val);
            }
        }
    }
    let proto = Object.getPrototypeOf(obj);
    while (proto && proto !== Object.prototype) {
        const descriptors = Object.getOwnPropertyDescriptors(proto);
        for (const [key, descriptor] of Object.entries(descriptors)) {
            if (shouldIncludeKey(obj, key) && typeof descriptor.get === 'function' && !(key in result)) {
                try {
                    const val = obj[key];
                    result[key] = toPublicJSON(val);
                } catch { }
            }
        }
        proto = Object.getPrototypeOf(proto);
        return result;
    }
}

export function AutoExport() {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        constructor.prototype.toJSON = function () {
            return toPublicJSON(this);
        };
    };
}