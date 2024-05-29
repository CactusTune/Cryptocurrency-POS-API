import { IsEmail, IsNotEmpty, IsString, isNumber } from 'class-validator';

export class UpdateMerchantDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsEmail()
  paypal_email: string;
}
