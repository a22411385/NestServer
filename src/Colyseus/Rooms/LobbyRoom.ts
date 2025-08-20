import { Room, Client, updateLobby, Presence } from "colyseus";

import { matchMaker } from "colyseus";
import { MapSchema } from "@colyseus/schema";
import { LobbyPlayer, LobbyRoomInfo, LobbyState } from "@/Colyseus/Schema/LobbyState";
import mitt from 'mitt'

export type LobbyRoomEvents = {

    roomCreated: { roomId: string, roomInfo: LobbyRoomInfo };
    roomDeleted: { roomId: string };
    roomUpdated: { roomId: string, roomInfo: LobbyRoomInfo };
    roomStateChanged: { roomId: string, state: RoomStateType };
};

export const LobbyRoomBus = mitt<LobbyRoomEvents>();


import { MiddleRoom } from "./MiddleRoom";
import { RoomStateType } from "../Schema/GameState";

export class LobbyRoom extends MiddleRoom<LobbyState> {

    maxClients = 100; // 大廳可以容納很多玩家
    autoDispose = false; // 大廳不自動銷毀



    onCreate() {
        console.log("Lobby room created");

        // 初始化純淨的 Schema 狀態
        this.state = new LobbyState();

        this.state.rooms = new MapSchema<LobbyRoomInfo>();
        this.state.players = new MapSchema<LobbyPlayer>();
        this.onMessage("*", this.MessageHandler.bind(this));
        LobbyRoomBus.on("roomCreated", (data) => {
            this.state.rooms.set(data.roomId, data.roomInfo);
        });
        LobbyRoomBus.on("roomDeleted", (data) => {
            this.state.rooms.delete(data.roomId);
        });
        LobbyRoomBus.on("roomUpdated", (data) => {
            this.state.rooms.set(data.roomId, data.roomInfo);
        });
        LobbyRoomBus.on("roomStateChanged", (data) => {
            const room = this.state.rooms.get(data.roomId);
            if (room) {
                room.state = data.state;
            }
        });
        console.log("Lobby room initialized successfully");
    }

    async onJoin(client: Client, options: any, auth: LobbyPlayer): Promise<LobbyPlayer> {
        console.log(`Player ${client.sessionId} joined lobby`);

        try {
            // 業務邏輯：驗證和處理玩家加入
            let playerData = auth
            // 更新狀態
            this.state.players.set(client.sessionId, playerData);


            // 發送歡迎訊息給新玩家
            client.send("lobbyWelcome", {
                playerId: client.sessionId,

            });

            return playerData;
        } catch (error) {
            console.error(`Error adding player ${client.sessionId}:`, error);
            client.send("error", { message: "Failed to join lobby: " + error.message });
            client.leave();
            throw error;
        }
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`Player ${client.sessionId} left lobby, consented: ${consented}`);

        const player = this.state.players.get(client.sessionId);
        if (player) {

            this.state.players.delete(client.sessionId);

        }
    }

    private async MessageHandler(client: Client, type: string, message: any) {
        switch (type) {
            // case "createRoom":

            default:
                console.warn(`Unhandled message type: ${type}`);
        }
    }
    /**
     * 清理資源
     */
    onDispose() {
        console.log("Lobby room disposed");
        // 清理定時器等資源
        this.clock.clear();
    }
}
