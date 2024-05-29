import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentsModule } from './payments/payments.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantModule } from './merchant/merchant.module';
import { Merchant } from './typeorm/Merchant';
import { Transaction } from './typeorm/Transaction';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT'),
        username: config.get<string>('DATABASE_USER'),
        database: config.get<string>('DATABASE_NAME'),
        password: config.get<string>('DATABASE_PASSWORD'),
        entities: [Merchant, Transaction],
        synchronize: true,
      }),
    }),
    PaymentsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: false,
    }),
    WebhooksModule,
    MerchantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
