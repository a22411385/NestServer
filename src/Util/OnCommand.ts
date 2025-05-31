// OnCommand.ts
import { ClientCommandType } from 'src/Shared/Enum';

type CommandHandler = (payload: any, playerId: string) => void;

const commandRegistry: { type: ClientCommandType, handler: CommandHandler }[] = [];

export function OnCommand(type: ClientCommandType) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        commandRegistry.push({ type, handler: descriptor.value });
    };
}

export function registerCommandHandlers(
    registry: Map<ClientCommandType, CommandHandler>,
    context: any,
) {
    for (const { type, handler } of commandRegistry) {
        registry.set(type, handler.bind(context)); // 綁定 context
    }
}