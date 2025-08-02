import { Room, Client } from "colyseus";
import { LobbyState, RoomInfo } from "../Schema/LobbyState";
import { matchMaker } from "colyseus";

export class LobbyRoom extends Room {
    maxClients = 100; // 大廳可以容納很多玩家
    autoDispose = false; // 大廳不自動銷毀

    // 使用簡單的 Map 來存儲玩家資料，避免 Schema 序列化問題
    private players = new Map<string, {
        id: string;
        name: string;
        characterId: number;
        level: number;
        status: string;
    }>();

    // 使用簡單的 Map 來存儲房間資料，避免 Schema 序列化問題
    private rooms = new Map<string, {
        roomId: string;
        roomName: string;
        hostName: string;
        currentPlayers: number;
        maxPlayers: number;
        isStarted: boolean;
        isPrivate: boolean;
    }>();

    private totalRooms = 0;
    private totalPlayers = 0;

    onCreate() {
        console.log("Lobby room created");
        // 不再使用 LobbyState Schema，避免序列化問題
        // this.state = new LobbyState();
        this.setupMessageHandlers();

        // 監聽其他房間的變化
        this.onMessage("*", (client, type, message) => {
            console.log(`Lobby received message: ${type}`, message);
        });
    }

    onJoin(client: Client, options: any) {
        console.log(`Player ${client.sessionId} joined lobby`);
        const sessionId = client.sessionId;

        try {
            // 確保參數有效
            const playerName = options.playerName || `Player${sessionId.substring(0, 6)}`;
            const characterId = options.characterId || 1;

            console.log(`Adding player to lobby: ${playerName}, characterId: ${characterId}`);

            // 使用簡單的對象存儲，避免 Schema 序列化問題
            const playerData = {
                id: sessionId,
                name: playerName,
                characterId: characterId,
                level: 1,
                status: "idle"
            };

            this.players.set(sessionId, playerData);
            this.totalPlayers = this.players.size;
            console.log(`Player ${sessionId} successfully added to lobby state`);

            // 立即發送當前大廳狀態
            client.send("lobbyState", {
                rooms: Array.from(this.rooms.values()).map(room => ({
                    roomId: room.roomId,
                    roomName: room.roomName,
                    hostName: room.hostName,
                    currentPlayers: room.currentPlayers,
                    maxPlayers: room.maxPlayers,
                    isStarted: room.isStarted,
                    isPrivate: room.isPrivate,
                })),
                totalPlayers: this.totalPlayers,
                totalRooms: this.totalRooms,
            });

            //通知其他玩家有新玩家加入大廳
            this.broadcast("playerJoinedLobby", {
                playerId: sessionId,
                playerName: playerName,
                characterId: characterId,
            }, { except: client });

        } catch (error) {
            console.error(`Error in onJoin for player ${sessionId}:`, error);
            console.error('Error stack:', error.stack);
            client.send("error", { message: "Failed to join lobby" });
            client.leave();
        }
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`Player ${client.sessionId} left lobby`);

        const player = this.players.get(client.sessionId);
        if (player) {
            this.players.delete(client.sessionId);
            this.totalPlayers = this.players.size;

            // 通知其他玩家
            this.broadcast("playerLeftLobby", {
                playerId: client.sessionId,
                playerName: player.name,
            });
        }
    }

    private setupMessageHandlers() {
        // 創建房間
        this.onMessage("createRoom", async (client, message) => {
            try {
                const player = this.players.get(client.sessionId);
                if (!player) {
                    client.send("error", { message: "Player not found in lobby" });
                    return;
                }

                // 創建遊戲房間
                const room = await matchMaker.createRoom("game_room", {
                    roomName: message.roomName,
                    maxPlayers: message.maxPlayers || 6,
                    hostId: client.sessionId,
                    hostName: player.name,
                    hostCharacterId: player.characterId,
                });

                // 添加房間到大廳狀態（使用本地 Map 避免 Schema 序列化問題）
                const roomData = {
                    roomId: room.room.roomId,
                    roomName: message.roomName,
                    hostName: player.name,
                    currentPlayers: 0,
                    maxPlayers: message.maxPlayers || 6,
                    isStarted: false,
                    isPrivate: message.isPrivate || false,
                };

                this.rooms.set(room.room.roomId, roomData);
                this.totalRooms++;
                player.status = "inRoom";

                // 通知所有大廳玩家新房間已創建
                this.broadcast("roomCreated", {
                    roomId: room.roomId,
                    roomName: message.roomName,
                    hostName: player.name,
                    currentPlayers: 0,
                    maxPlayers: message.maxPlayers || 6,
                    isPrivate: message.isPrivate || false,
                });

                // 回傳房間資訊給創建者
                client.send("roomCreated", {
                    roomId: room.room.roomId,
                    success: true,
                });

            } catch (error) {
                console.error("Error creating room:", error);
                client.send("error", { message: "Failed to create room" });
            }
        });

        // 加入房間
        this.onMessage("joinRoom", async (client, message) => {
            try {
                const player = this.players.get(client.sessionId);
                if (!player) {
                    client.send("error", { message: "Player not found in lobby" });
                    return;
                }

                // 嘗試加入遊戲房間
                const room = await matchMaker.joinById(message.roomId, {
                    playerName: player.name,
                    characterId: player.characterId,
                });

                player.status = "inRoom";

                // 更新大廳中的房間玩家數量
                this.updateRoomPlayerCount(message.roomId);

                // 回傳成功訊息
                client.send("joinedRoom", {
                    roomId: room.room.roomId,
                    success: true,
                });

            } catch (error) {
                console.error("Error joining room:", error);
                client.send("error", { message: "Failed to join room" });
            }
        });

        // 快速加入房間
        this.onMessage("quickJoin", async (client, message) => {
            try {
                const player = this.players.get(client.sessionId);
                if (!player) {
                    client.send("error", { message: "Player not found in lobby" });
                    return;
                }

                // 嘗試快速加入可用房間
                const room = await matchMaker.joinOrCreate("game_room", {
                    playerName: player.name,
                    characterId: player.characterId,
                });

                player.status = "inRoom";

                client.send("joinedRoom", {
                    roomId: room.room.roomId,
                    success: true,
                });

            } catch (error) {
                console.error("Error quick joining:", error);
                client.send("error", { message: "No available rooms" });
            }
        });

        // 刷新房間列表
        this.onMessage("refreshRooms", (client) => {
            this.sendRoomList(client);
        });

        // 獲取房間詳情
        this.onMessage("getRoomInfo", async (client, message) => {
            try {
                const rooms = await matchMaker.query({
                    name: "game_room",
                    roomId: message.roomId,
                });

                if (rooms.length > 0) {
                    client.send("roomInfo", {
                        roomId: rooms[0].roomId,
                        name: rooms[0].metadata?.roomName,
                        currentPlayers: rooms[0].clients,
                        maxPlayers: rooms[0].maxClients,
                        isStarted: rooms[0].metadata?.isStarted || false,
                    });
                } else {
                    client.send("error", { message: "Room not found" });
                }
            } catch (error) {
                client.send("error", { message: "Failed to get room info" });
            }
        });
    }

    private async sendRoomList(client: Client) {
        try {

            // 獲取所有遊戲房間
            const rooms = await matchMaker.query({ name: "game_room" });

            // 更新大廳狀態中的房間列表（使用本地 Map 避免 Schema 序列化問題）
            this.rooms.clear();
            this.totalRooms = 0;

            rooms.forEach(room => {
                const roomData = {
                    roomId: room.roomId,
                    roomName: room.metadata?.roomName || "Unknown Room",
                    hostName: room.metadata?.hostName || "Unknown Host",
                    currentPlayers: room.clients,
                    maxPlayers: room.maxClients,
                    isStarted: room.metadata?.isStarted || false,
                    isPrivate: room.metadata?.isPrivate || false,
                };
                this.rooms.set(room.roomId, roomData);
                this.totalRooms++;
            });

            client.send("roomList", {
                rooms: Array.from(this.rooms.values()).map(room => ({
                    roomId: room.roomId,
                    roomName: room.roomName,
                    hostName: room.hostName,
                    currentPlayers: room.currentPlayers,
                    maxPlayers: room.maxPlayers,
                    isStarted: room.isStarted,
                    isPrivate: room.isPrivate,
                })),
            });
        } catch (error) {
            console.error("Error getting room list:", error);
            client.send("error", { message: "Failed to get room list" });
        }
    }

    private async updateRoomPlayerCount(roomId: string) {
        try {
            const rooms = await matchMaker.query({
                name: "game_room",
                roomId: roomId,
            });

            if (rooms.length > 0) {
                // 更新本地房間數據
                const roomData = this.rooms.get(roomId);
                if (roomData) {
                    roomData.currentPlayers = rooms[0].clients;
                }

                // 廣播房間更新
                this.broadcast("roomUpdated", {
                    roomId: roomId,
                    currentPlayers: rooms[0].clients,
                });
            }
        } catch (error) {
            console.error("Error updating room player count:", error);
        }
    }
}
