import { io, Socket } from 'socket.io-client';

export class SocketService {

    private socket?: Socket;

    // 私有化建構子，防止外部創建新實例
    public constructor() { }
    // 初始化 socket 連接
    async init(url: string) {
        if (this.socket?.connected) this.socket.disconnect(); // 已經連接則先斷線
        console.log("開始連線");
        this.socket = io(url);

        // 監聽斷線事件，釋放資源
        this.socket.on('disconnect', () => {
            this.cleanup();

        });
        await this.waitForConnect(this.socket);
    }

    // 发送消息
    send<T = any>(event: string, data?: any): Promise<T> {
        if (!this.socket) throw new Error('Socket not initialized');
        return new Promise((resolve, reject) => {
            this.socket!.timeout(5000).emit(event, data, (err: any, res: T) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
    }

    // 監聽消息
    on<T = any>(event: string, handler: (data: T) => void): void {
        this.socket?.on(event, handler);
    }

    // 移除監聽
    off(event: string): void {
        this.socket?.off(event);
    }

    // 斷開連接並釋放資源
    disconnect(): void {
        this.socket?.disconnect();
        this.cleanup();
    }

    // 釋放資源，這是清理的地方
    private cleanup(): void {
        if (this.socket) {
            this.socket.off(); // 移除所有事件監聽
            this.socket = undefined; // 清除 socket 實例
        }
    }
    private async waitForConnect(socket: Socket, timeoutMs = 5000): Promise<void> {
        if (socket.connected) {
            return; // 已連線直接結束
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                socket.off('connect', onConnect);
                socket.off('connect_error', onError);
                reject(new Error(`Socket 連線超時，等待超過 ${timeoutMs} 毫秒`));
            }, timeoutMs);

            const onConnect = () => {
                clearTimeout(timeout);
                resolve();
            };

            const onError = (err: any) => {
                clearTimeout(timeout);
                reject(new Error(`Socket 連線錯誤: ${err?.message || err}`));
            };

            socket.once('connect', onConnect);
            socket.once('connect_error', onError);
        });
    }
}
