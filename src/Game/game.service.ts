import { Injectable } from '@nestjs/common';

@Injectable()
export class GameService {
    private gameStates = new Map<string, any>();

    processPlayerAction(roomId: string, playerId: string, action: string) {
        // 這裡可以根據你的遊戲邏輯進行處理
        let state = this.gameStates.get(roomId) || {
            log: [],
            turn: playerId,
        };

        state.log.push({ playerId, action });
        state.turn = this.getNextPlayer(state, playerId);

        this.gameStates.set(roomId, state);
        return state;
    }

    private getNextPlayer(state: any, currentPlayerId: string): string {
        // 範例輪替邏輯（你可以改用隊列等方式）
        return currentPlayerId; // 實際實作你可以返回下一位
    }
}