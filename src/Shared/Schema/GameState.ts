import { Schema, type, MapSchema } from "@colyseus/schema";

export interface PlayerInfo {
    id: string;
    name: string;
    characterId: number;
    isReady: boolean;
    isHost: boolean;
}

export class Player extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("number") characterId: number = 1;
    @type("boolean") isReady: boolean = false;
    @type("boolean") isHost: boolean = false;
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") hp: number = 100;
    @type("number") maxHp: number = 100;
    @type("number") level: number = 1;
    @type("number") exp: number = 0;
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type("string") roomName: string = "";
    @type("number") maxPlayers: number = 6;
    @type("string") gameState: string = "waiting";
    @type("number") gameTime: number = 0;
    @type("boolean") isStarted: boolean = false;

    // 遊戲設置
    @type("number") waveNumber: number = 1;
    @type("number") zombieCount: number = 0;
    @type("number") totalZombies: number = 0;
    /*
        // 重新啟用 addPlayer 方法
        addPlayer(playerInfo: PlayerInfo) {
            try {
                // 驗證輸入參數
                if (!playerInfo || !playerInfo.id) {
                    throw new Error('Invalid playerInfo: missing id');
                }
    
                console.log(`GameState: Adding player ${playerInfo.id}`);
    
                // 確保使用正確的 Schema 初始化方式
                const player = new Player();
                player.id = String(playerInfo.id || '');
                player.name = String(playerInfo.name || '');
                player.characterId = Number(playerInfo.characterId) || 1;
                player.isReady = Boolean(playerInfo.isReady);
                player.isHost = Boolean(playerInfo.isHost);
    
                this.players.set(playerInfo.id, player);
                console.log(`GameState: Player ${playerInfo.id} added successfully`);
                // return player;
            } catch (error) {
                console.error('GameState: Error adding player:', error);
                throw error;
            }
        }
    
        removePlayer(playerId: string): void {
            this.players.delete(playerId);
        }
    
        getPlayer(playerId: string): Player | undefined {
            return this.players.get(playerId);
        }
    
        getAllReady(): boolean {
            if (this.players.size === 0) return false;
    
            for (const [_, player] of this.players) {
                if (!player.isReady) return false;
            }
            return true;
        }
    
        setPlayerReady(playerId: string, ready: boolean): void {
            const player = this.getPlayer(playerId);
            if (player) {
                player.isReady = ready;
            }
        }
    
        startGame(): void {
            this.gameState = "playing";
            this.isStarted = true;
            this.gameTime = 0;
        }
    
        updateGameTime(deltaTime: number): void {
            this.gameTime += deltaTime;
        }*/
}
