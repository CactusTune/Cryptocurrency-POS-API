import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PaymentsService } from 'src/payments/payments.service';
import { ConfigService } from '@nestjs/config';
import { coinbase_webhook_body } from './webhook.body';
import { Transaction } from 'src/typeorm/Transaction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from 'src/typeorm/Merchant';
import { TransactionType } from 'src/typeorm/Transaction';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  private readonly paypal_client_id: string;
  private readonly paypal_client_secret: string;
  private readonly paypal_sanbox_api_url: string;
  private readonly paypal_webhook_id: string;

  constructor(
    private paymentsService: PaymentsService,
    private configService: ConfigService,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {
    this.paypal_client_id = this.configService.get<string>('PAYPAL_CLIENT_ID', {
      infer: true,
    });
    this.paypal_client_secret = this.configService.get<string>(
      'PAYPAL_CLIENT_SECRET',
      { infer: true },
    );
    this.paypal_webhook_id =
      this.configService.get<string>('PAYPAL_WEBHOOK_ID');
    this.paypal_sanbox_api_url = this.configService.get<string>(
      'PAYPAL_SANDBOX_API_URL',
    );
  }

  async webhookVerifyPayment() {
    try {
      /* Coinbase Webhook setup, needs live transaction, make use of dummy coinbase_webhook body*/

      /* const event: any = Coinbase.Webhook.verifyEventBody(
            req.rawBody,
            req.headers['x-cc-webhook-signature'],
            this.configService.get<string>('COINBASE_WEBHOOK_SECRET'),
          );
      */

      let event = coinbase_webhook_body.event;

      if (event.type == 'charge:confirmed') {
        let amount = event.data.pricing.settlement.amount;
        let currency = event.data.pricing.settlement.currency;
        let merchant_id = event.data.metadata.merchant_id;
        let paypal_email = event.data.metadata.email;
        let sender_address = event.data.web3_data.success_events[0].sender;
        let transaction_time = event.data.created_at;

        const merchant = await this.merchantRepository.findOne({
          where: { id: merchant_id },
        });

        if (!merchant) {
          throw new HttpException(
            'Merchant does not exist',
            HttpStatus.NOT_FOUND,
          );
        }

        let db_amount = parseInt(amount);
        const merchant_transactions = this.transactionRepository.create({
          sender_address: sender_address,
          amount: db_amount,
          currency: currency,
          transaction_time: transaction_time,
          transaction_status: 'completed',
          transaction_type: TransactionType.PAY_IN,
          merchant: merchant,
        });

        await this.transactionRepository.save(merchant_transactions);

        const initialize_payout = await this.paymentsService.createPaypalPayout(
          'USD',
          amount,
          paypal_email,
          merchant_id.toString(),
        );
        if (initialize_payout) {
          return true;
        }
      }
    } catch (error: any) {
      console.error(error);
      throw new HttpException(
        'Webhook server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyPayPalWebhookSignature(
    headers: any,
    body: any,
  ): Promise<boolean> {
    const credentials = Buffer.from(
      `${this.paypal_client_id}:${this.paypal_client_secret}`,
    ).toString('base64');

    const response = await axios.post(
      `${this.paypal_client_secret}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    const accessToken = response.data.access_token;

    const verifyResponse = await axios.post(
      `${this.paypal_sanbox_api_url}/v1/notifications/verify-webhook-signature`,
      {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: `${this.paypal_webhook_id}`,
        webhook_event: body,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (
      verifyResponse.data.verification_status === 'SUCCESS' &&
      body.resource.payout_item.amount != undefined
    ) {
      const amount = body.resource.payout_item.amount.value;
      const currency = body.resource.payout_item.amount.currency;
      const transaction_time = body.create_time;
      const merchant_id = parseInt(body.resource.payout_item.sender_item_id);

      const merchant = await this.merchantRepository.findOne({
        where: { id: merchant_id },
      });

      if (!merchant) {
        throw new HttpException(
          'Merchant does not exist',
          HttpStatus.NOT_FOUND,
        );
      }
      const merchant_transactions = this.transactionRepository.create({
        amount: parseInt(amount, 10),
        currency: currency,
        transaction_time: transaction_time,
        transaction_status: 'completed',
        transaction_type: TransactionType.PAY_OUT,
        merchant: merchant,
      });
      await this.transactionRepository.save(merchant_transactions);

      return true;
    }

    return false;
  }
}
