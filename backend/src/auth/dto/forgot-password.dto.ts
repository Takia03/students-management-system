import {IsEmail, isEmail} from 'class-validator';

export class ForgotPasswordDto{
    @IsEmail()
    email: string;
}