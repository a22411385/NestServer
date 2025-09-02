
export interface JWTPayload {

    userId: number;
    openId: string;

    //如果undefined代表他還沒選角
    playerId: number | undefined;

}

export interface HttpRespone {
    content: unknown;
    errorCode: number;

}
// export interface WebSocketPayload {

//     userId: number;
//     playerId: number;
// }