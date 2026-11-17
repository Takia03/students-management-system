import type { Request } from 'express';


//what to store 
export interface JwtPayload {
    sub: number; //user id
    email: string;
    token_version: number;
}


//request after verification

export interface AuthRequest extends Request {
    user?:JwtPayload;
}
