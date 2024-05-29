import { Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { WebhooksService } from 'src/webhooks/webhooks.service';
import { Response, Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('coinbase')
  async webhookEndpoint(@Res() res: Response) {
    this.webhooksService.webhookVerifyPayment();

    return res.status(HttpStatus.CREATED).send({
      status: true,
      message: 'Crypto deposit successful, processing payout to paypal account',
    });
  }

  @Post('paypal')
  async handlePayPalWebhook(@Req() req: Request, @Res() res: Response) {
    const webhookEvent = req.body;
    const headers = req.headers;

    const isValid = await this.webhooksService.verifyPayPalWebhookSignature(
      headers,
      webhookEvent,
    );
    if (!isValid) {
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }

    return res.status(HttpStatus.OK).send('Webhook processed');
  }
}
