export interface HttpRespone {
    content: any;
    errorCode: number;
    errorMsg: string | string[]

}
export interface JWTPayload {

    userId: number;
    openId: string;

}

