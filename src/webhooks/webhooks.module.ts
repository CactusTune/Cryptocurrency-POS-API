import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { PaymentsService } from 'src/payments/payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/typeorm/Merchant';
import { Transaction } from 'src/typeorm/Transaction';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant, Transaction])],
  providers: [WebhooksService, PaymentsService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
