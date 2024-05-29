import { Body, Controller, Get, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('exchange')
  async paymentCharge(
    @Body('cryptocurrency') cryptocurrency: string,
  ): Promise<any> {
    return this.paymentsService.getExchangeRates(cryptocurrency);
  }
}
