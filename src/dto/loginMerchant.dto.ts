import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginMerchantDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
