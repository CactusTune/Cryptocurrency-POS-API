import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Coinbase from 'coinbase-commerce-node';
import * as Paypal from '@paypal/payouts-sdk';
import * as randomstring from 'randomstring';
import axios from 'axios';

@Injectable()
export class PaymentsService {
  private chargeResource: typeof Coinbase.resources.Charge;
  private paypalClient: Paypal.core.PayPalHttpClient;
  private readonly coin_api_url: string;
  private coin_api_key: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('COINBASE_API_KEY');
    const paypal_client_id = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const paypal_client_secret = this.configService.get<string>(
      'PAYPAL_CLIENT_SECRET',
    );
    this.coin_api_key = this.configService.get<string>('COIN_API_KEY');
    this.coin_api_url = this.configService.get<string>('COIN_API_URL');

    let paypal_enviroment = new Paypal.core.SandboxEnvironment(
      paypal_client_id,
      paypal_client_secret,
    );

    this.paypalClient = new Paypal.core.PayPalHttpClient(paypal_enviroment);

    Coinbase.Client.init(`${apiKey}`);
    this.chargeResource = Coinbase.resources.Charge;
  }

  async getExchangeRates(cryptocurrency: string) {
    try {
      const headers = {
        'X-CoinAPI-Key': this.coin_api_key,
      };

      const response = await axios.get(
        `${this.coin_api_url}=${cryptocurrency}`,
        {
          headers,
        },
      );

      return {
        coin_name: response.data[0].name,
        USD_value: response.data[0].price_usd,
      };
    } catch (e) {
      console.error('API Error:', e);
      if (e.statusCode) {
        console.log('Status code:', e.statusCode);
        const error = JSON.parse(e.message);
        console.log('Failure response:', error);
        console.log('Headers:', e.headers);
      }
      throw new HttpException(
        'Failed to retrieve cryptocurrency rate',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cryptoPayment(
    merchant_id: number,
    name: string,
    email: string,
    amount: number,
    currency: any,
  ): Promise<any> {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      throw new Error('Invalid amount provided for paymentCharge.');
    }

    const fixed_amount = numericAmount.toFixed(2);

    const chargeData: Coinbase.CreateCharge = {
      name: 'Test Product',
      description: 'Test Description',
      pricing_type: 'fixed_price',
      local_price: {
        amount: fixed_amount,
        currency: currency,
      },
      metadata: {
        merchant_id: merchant_id,
        name: name,
        email: email,
      },
    };

    const charge = await this.chargeResource.create(chargeData);

    return charge;
  }

  async createPaypalPayout(
    currency: string,
    amount: string,
    paypal_email: string,
    merchant_id: string,
  ) {
    try {
      const batch_id = randomstring.generate(7);

      const paypalRequestBody: Paypal.CreatePayoutRequestBody = {
        sender_batch_header: {
          recipient_type: 'EMAIL',
          email_message: 'SDK payouts test txn',
          note: 'Enjoy your Payout!!',
          sender_batch_id: batch_id,
          email_subject: 'This is a test transaction from SDK',
        },
        items: [
          {
            note: `Your ${currency} ${amount} Payout!`,
            amount: {
              currency,
              value: amount,
            },
            receiver: paypal_email,
            sender_item_id: merchant_id,
          },
        ],
      };

      const request = new Paypal.payouts.PayoutsPostRequest();

      request.requestBody(paypalRequestBody);

      const response = await this.paypalClient.execute(request);

      return response.result;
    } catch (e) {
      console.error('PayPal API Error:', e);
      if (e.statusCode) {
        console.log('Status code:', e.statusCode);
        const error = JSON.parse(e.message);
        console.log('Failure response:', error);
        console.log('Headers:', e.headers);
      }
      throw new HttpException(
        'Failed to create PayPal payout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
