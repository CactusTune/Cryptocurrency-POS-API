import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../typeorm/Merchant';
import { Transaction } from '../typeorm/Transaction';
import { RegisterMerchantParams } from '../utils/types';
import { RegisterUserResponse } from '../dto/merchantResponse.dto';
import { LoginMerchantDto } from '../dto/loginMerchant.dto';
import { UpdateMerchantDto } from '../dto/updateMerchant.dto';
import { PaymentsService } from '../payments/payments.service';
import { MakeCryptoPaymentDto } from '../dto/makeCryptoPayment.dto';
import { TransactionType } from '../typeorm/Transaction';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

const salt_rounds = 10;

@Injectable()
export class MerchantService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private paymentsService: PaymentsService,
  ) {}

  async registerMerchant(
    createMerchantDetails: RegisterMerchantParams,
  ): Promise<RegisterUserResponse> {
    try {
      const already_exists = await this.merchantRepository.findOne({
        where: {
          email: createMerchantDetails.email,
        },
      });

      if (already_exists) {
        throw new HttpException('User already exists.', HttpStatus.BAD_REQUEST);
      }

      const hashed_password = await bcrypt.hash(
        createMerchantDetails.password,
        salt_rounds,
      );

      const new_user_details = {
        ...createMerchantDetails,
        password: hashed_password,
      };

      const new_merchant = this.merchantRepository.create(new_user_details);

      await this.merchantRepository.save(new_merchant);

      return {
        id: new_merchant.id,
        email: new_merchant.email,
        name: new_merchant.name,
      };
    } catch (error) {
      console.error('Failed to register merchant on the platform:', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to register merchant due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async generateJWT(user: any): Promise<string> {
    console.log(user);
    const payload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload);
  }

  async loginUser(loginDto: LoginMerchantDto): Promise<string | object> {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: {
          email: loginDto.email,
        },
      });

      const isMatch = await bcrypt.compare(
        loginDto.password,
        merchant.password,
      );

      if (!isMatch) {
        throw new HttpException(
          'Merchant not exists or wrong password.',
          HttpStatus.NOT_FOUND,
        );
      } else {
        const { password, ...user_details } = merchant;

        return {
          user: user_details,
        };
      }
    } catch (error) {
      console.error('Failed to login merchant', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to login merchant due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async updateMerchantAccount(
    merchant_id: any,
    updateMerchantDetails: UpdateMerchantDto,
  ): Promise<string | object> {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: {
          id: merchant_id,
        },
      });

      if (!merchant) {
        throw new HttpException(
          'Merchant does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      const update_merchant = await this.merchantRepository.update(
        merchant_id,
        {
          email: updateMerchantDetails.email,
          name: updateMerchantDetails.name,
          paypal_email: updateMerchantDetails.paypal_email,
        },
      );

      return update_merchant;
    } catch (error) {
      console.error('Failed to update merchant data', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to update merchant data due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async deleteMerchantAccount(merchant_id: any): Promise<string | object> {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: {
          id: merchant_id.id,
        },
      });

      if (!merchant) {
        throw new HttpException(
          'Merchant to delete does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      const delete_merchant = await this.merchantRepository.delete(merchant_id);

      return delete_merchant;
    } catch (error) {
      console.error('Failed to delete merchant', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to delete merchant due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async merchantCryptoPayment(
    merchant_id: number,
    makeCryptoPayment: MakeCryptoPaymentDto,
  ) {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: {
          id: merchant_id,
        },
      });

      if (!merchant) {
        throw new HttpException(
          'Merchant does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      return this.paymentsService.cryptoPayment(
        merchant_id,
        merchant.name,
        merchant.paypal_email,
        makeCryptoPayment.amount,
        makeCryptoPayment.currency,
      );
    } catch (error) {
      console.error('Failed to delete merchant', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to delete merchant due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async getMerchantDeposits(merchant_id: any) {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: {
          id: merchant_id.id,
        },
      });

      if (!merchant) {
        throw new HttpException(
          'Merchant does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      const deposit_history = await this.transactionRepository.find({
        where: {
          merchant,
          transaction_type: TransactionType.PAY_IN,
          transaction_status: 'completed',
        },
      });

      return deposit_history;
    } catch (error) {
      console.error('Failed to return deposit history', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to return deposit history due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async getMerchantPayouts(merchant_id: any) {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: {
          id: merchant_id.id,
        },
      });

      if (!merchant) {
        throw new HttpException(
          'Merchant does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      const deposit_history = await this.transactionRepository.find({
        where: {
          merchant,
          transaction_type: TransactionType.PAY_OUT,
          transaction_status: 'completed',
        },
      });

      return deposit_history;
    } catch (error) {
      console.error('Failed to return settlement history', error);

      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to return settlement history due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
