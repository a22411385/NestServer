import { Injectable } from '@nestjs/common';
import { matchMaker } from 'colyseus';

interface RoomListingData {
    roomId: string;
    clients: number;
    maxClients: number;
    metadata?: any;
}

@Injectable()
export class ColyseusService {

    // 獲取所有房間
    async getAllRooms(): Promise<RoomListingData[]> {
        try {
            return await matchMaker.query({});
        } catch (error) {
            console.error('Error getting all rooms:', error);
            return [];
        }
    }

    // 根據房間ID獲取房間
    async getRoomById(roomId: string): Promise<RoomListingData | null> {
        try {
            const rooms = await matchMaker.query({ roomId });
            return rooms.length > 0 ? rooms[0] : null;
        } catch (error) {
            console.error('Error getting room by ID:', error);
            return null;
        }
    }

    // 創建房間
    async createRoom(roomName: string, options: any) {
        try {
            return await matchMaker.createRoom(roomName, options);
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }

    // 加入房間
    async joinRoom(roomId: string, options: any) {
        try {
            return await matchMaker.joinById(roomId, options);
        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }

    // 加入或創建房間
    async joinOrCreateRoom(roomName: string, options: any) {
        try {
            return await matchMaker.joinOrCreate(roomName, options);
        } catch (error) {
            console.error('Error joining or creating room:', error);
            throw error;
        }
    }

    // 獲取遊戲房間統計
    async getGameRoomStats() {
        try {
            const gameRooms = await matchMaker.query({ name: 'game_room' });
            return {
                total: gameRooms.length,
                playing: gameRooms.filter((room: any) => room.metadata?.isStarted).length,
                waiting: gameRooms.filter((room: any) => !room.metadata?.isStarted).length,
                totalPlayers: gameRooms.reduce((sum: number, room: any) => sum + room.clients, 0)
            };
        } catch (error) {
            console.error('Error getting game room stats:', error);
            return {
                total: 0,
                playing: 0,
                waiting: 0,
                totalPlayers: 0
            };
        }
    }

    // 獲取大廳統計
    async getLobbyStats() {
        try {
            const lobbies = await matchMaker.query({ name: 'lobby' });
            return {
                total: lobbies.length,
                totalPlayers: lobbies.reduce((sum: number, lobby: any) => sum + lobby.clients, 0)
            };
        } catch (error) {
            console.error('Error getting lobby stats:', error);
            return {
                total: 0,
                totalPlayers: 0
            };
        }
    }
}
