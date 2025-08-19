import { Room, Client, updateLobby, Presence } from "colyseus";

import { matchMaker } from "colyseus";
import { MapSchema } from "@colyseus/schema";
import { LobbyPlayer, LobbyRoomInfo, LobbyState } from "@/Colyseus/Schema/LobbyState";
import mitt from 'mitt'

export type LobbyRoomEvents = {

    roomCreated: { roomId: string, roomInfo: LobbyRoomInfo };
    roomDeleted: { roomId: string };
    roomUpdated: { roomId: string, roomInfo: LobbyRoomInfo };
};

export const LobbyRoomBus = mitt<LobbyRoomEvents>();


import { MiddleRoom } from "./MiddleRoom";

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
            case "createRoom":
                this.handleCreateRoom(client, message);
                break;
            case "joinRoom":
                this.handleJoinRoom(client, message);
                break;
            case "quickJoin":
                this.handleQuickJoin(client, message);
                break;
            // case "roomList":
            //     let rooms = await this.getRooms();
            //     client.send("roomList", rooms);
            //     break;
            default:
                console.warn(`Unhandled message type: ${type}`);
        }
    }

    /**
     * 業務邏輯：處理創建房間請求
     */
    private async handleCreateRoom(client: Client, message: any) {
        try {
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                client.send("error", { message: "Player not found in lobby" });
                return;
            }

            // 驗證房間設定
            const roomName = message.roomName?.trim();
            if (!roomName || roomName.length < 2) {
                client.send("error", { message: "Room name must be at least 2 characters" });
                return;
            }

            const maxPlayers = message.maxPlayers || 6;
            if (maxPlayers < 2 || maxPlayers > 10) {
                client.send("error", { message: "Max players must be between 2 and 10" });
                return;
            }

            // 創建遊戲房間
            const room = await matchMaker.createRoom("game", {
                roomName: roomName,
                maxPlayers: maxPlayers,
                hostId: client.sessionId,
                hostName: player.name,
                hostCharacterId: player.characterId,
                isPrivate: message.isPrivate || false,
            });

            // 更新玩家狀態
            player.status = "inRoom";
            const lobbyRoomInfo = new LobbyRoomInfo();
            lobbyRoomInfo.roomId = room.roomId;
            lobbyRoomInfo.roomName = roomName;
            lobbyRoomInfo.hostName = player.name;
            lobbyRoomInfo.currentPlayers = 0;
            lobbyRoomInfo.maxPlayers = maxPlayers;
            lobbyRoomInfo.isStarted = false;
            lobbyRoomInfo.isPrivate = message.isPrivate || false;

            this.state.rooms.set(room.roomId, lobbyRoomInfo);


            console.log(`Room "${roomName}" created by ${player.name}`);

        } catch (error) {
            console.error("Error creating room:", error);
            client.send("error", { message: "Failed to create room: " + error.message });
        }
    }


    /**
     * 業務邏輯：處理加入房間請求
     */
    private async handleJoinRoom(client: Client, message: any) {
        try {
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                client.send("error", { message: "Player not found in lobby" });
                return;
            }

            if (!message.roomId) {
                client.send("error", { message: "Room ID is required" });
                return;
            }

            // 檢查房間是否存在於大廳列表
            const lobbyRoom = this.state.rooms.get(message.roomId);
            if (!lobbyRoom) {
                client.send("error", { message: "Room not found" });
                return;
            }

            // 檢查房間是否已滿
            if (lobbyRoom.currentPlayers >= lobbyRoom.maxPlayers) {
                client.send("error", { message: "Room is full" });
                return;
            }

            // 檢查房間是否已開始
            if (lobbyRoom.isStarted) {
                client.send("error", { message: "Game has already started" });
                return;
            }

            // 嘗試加入遊戲房間
            const room = await matchMaker.joinById(message.roomId, {
                playerName: player.name,
                characterId: player.characterId,
            });

            // 更新玩家狀態
            player.status = "inRoom";

            // 回傳成功訊息
            client.send("joinedRoom", {
                roomId: room.room.roomId,
                success: true,
                message: "Joined room successfully"
            });

            console.log(`Player ${player.name} joined room ${message.roomId}`);

        } catch (error) {
            console.error("Error joining room:", error);
            client.send("error", { message: "Failed to join room: " + error.message });
        }
    }

    /**
     * 業務邏輯：處理快速加入請求
     */
    private async handleQuickJoin(client: Client, message: any) {
        try {
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                client.send("error", { message: "Player not found in lobby" });
                return;
            }

            // 尋找可用房間
            const availableRooms = Array.from(this.state.rooms.values())
                .filter(room =>
                    !room.isStarted &&
                    !room.isPrivate &&
                    room.currentPlayers < room.maxPlayers
                );

            if (availableRooms.length === 0) {
                // 沒有可用房間，創建新房間
                await this.handleCreateRoom(client, {
                    roomName: `${player.name}'s Room`,
                    maxPlayers: 4,
                    isPrivate: false
                });
                return;
            }

            // 加入第一個可用房間
            const targetRoom = availableRooms[0];
            await this.handleJoinRoom(client, { roomId: targetRoom.roomId });

        } catch (error) {
            console.error("Error in quick join:", error);
            client.send("error", { message: "Quick join failed: " + error.message });
        }
    }

    /**
     * 業務邏輯：處理獲取房間資訊請求
     */
    private async handleGetRoomInfo(client: Client, message: any) {
        try {
            if (!message.roomId) {
                client.send("error", { message: "Room ID is required" });
                return;
            }

            const lobbyRoom = this.state.rooms.get(message.roomId);
            if (lobbyRoom) {
                client.send("roomInfo", lobbyRoom);
            } else {
                // 嘗試從 matchMaker 獲取最新資訊
                const rooms = await matchMaker.query({
                    name: "game",
                    roomId: message.roomId,
                });

                if (rooms.length > 0) {
                    const room = rooms[0];
                    client.send("roomInfo", {
                        roomId: room.roomId,
                        roomName: room.metadata?.roomName || "Unknown Room",
                        hostName: room.metadata?.hostName || "Unknown Host",
                        currentPlayers: room.clients,
                        maxPlayers: room.maxClients,
                        isStarted: room.metadata?.isStarted || false,
                        isPrivate: room.metadata?.isPrivate || false,
                    });
                } else {
                    client.send("error", { message: "Room not found" });
                }
            }
        } catch (error) {
            console.error("Error getting room info:", error);
            client.send("error", { message: "Failed to get room info" });
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
