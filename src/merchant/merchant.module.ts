import { Module } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { MerchantController } from './merchant.controller';
import { Merchant } from 'src/typeorm/Merchant';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from 'src/typeorm/Transaction';
import { PaymentsService } from 'src/payments/payments.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1h'),
        },
      }),
    }),
    TypeOrmModule.forFeature([Merchant, Transaction]),
    ConfigModule,
  ],
  providers: [MerchantService, PaymentsService, JwtStrategy],
  controllers: [MerchantController],
})
export class MerchantModule {}
