export interface HttpRespone {
    content: any;
    errorCode: number;
    errorMsg: string | string[]

}
export interface JWTPayload {

    userId: number;
    openId: string;

}

export enum 職業種類 {

    初心者 = 0,
}