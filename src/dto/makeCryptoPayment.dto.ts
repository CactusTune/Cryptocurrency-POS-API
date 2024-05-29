import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MakeCryptoPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  @IsString()
  currency: string;
}
