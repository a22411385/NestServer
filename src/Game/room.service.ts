import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { BattleRoom } from './BattleRoom';

@Injectable()
export class RoomService {
    private roomMap = new Map<string, BattleRoom>();

    createRoom(roomName: string, areaID: number): string {

        let r = new BattleRoom(roomName, areaID);
        if (this.roomMap.has(r.UniqueID)) {
            return '';
        }
        this.roomMap.set(r.UniqueID, r);
        return r.UniqueID;
    }

    addPlayerToRoom(roomId: string, playerId: number, socket: Socket) {
        if (!this.roomMap.has(roomId)) {
            throw 'error room ID';
        }

        this.roomMap.get(roomId)?.SetPlayer(playerId, socket);
        socket.data.roomId = roomId;
        socket.data.playerId = playerId;
    }

    removePlayerFromRoom(socket: Socket) {
        const { roomId, playerId } = socket.data;
        if (this.roomMap.has(roomId)) {
            this.roomMap.get(roomId)?.RemovePlayer(playerId);
        }
    }

    getPlayersInRoom(roomId: string): number[] {
        let r = this.roomMap.get(roomId);
        return r ? r.GetPlayersId() : [];
    }
}