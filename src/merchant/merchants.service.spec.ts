import { Test, TestingModule } from '@nestjs/testing';
import { MerchantService } from './merchant.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Merchant } from '../typeorm/Merchant';
import { Transaction } from '../typeorm/Transaction';
import { JwtService } from '@nestjs/jwt';
import { PaymentsService } from '../payments/payments.service';
import { Repository } from 'typeorm';
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const salt_rounds = 10;

describe('MerchantService', () => {
  let service: MerchantService;
  let merchantRepositoryMock: Partial<
    Record<keyof Repository<Merchant>, jest.Mock>
  >;
  let transactionRepositoryMock: Partial<
    Record<keyof Repository<Transaction>, jest.Mock>
  >;
  let paymentsServiceMock: Partial<PaymentsService>;
  let jwtServiceMock: Partial<JwtService>;

  beforeEach(async () => {
    merchantRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    transactionRepositoryMock = {
      find: jest.fn(),
    };

    paymentsServiceMock = {
      cryptoPayment: jest.fn(),
    };

    jwtServiceMock = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantService,
        {
          provide: getRepositoryToken(Merchant),
          useValue: merchantRepositoryMock,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepositoryMock,
        },
        {
          provide: PaymentsService,
          useValue: paymentsServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<MerchantService>(MerchantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerMerchant', () => {
    it('should throw if merchant already exists', async () => {
      merchantRepositoryMock.findOne.mockResolvedValue(new Merchant());

      await expect(
        service.registerMerchant({
          email: 'test@test.com',
          password: '123456',
          name: 'testuser',
        }),
      ).rejects.toThrow(HttpException);
    });

    describe('registerMerchant', () => {
      it('should throw if merchant already exists', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue(new Merchant());

        await expect(
          service.registerMerchant({
            email: 'test@test.com',
            name: 'Test User',
            password: '123456',
          }),
        ).rejects.toThrow(HttpException);
      });

      it('should throw a general error if saving the merchant fails', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue(undefined);
        merchantRepositoryMock.create.mockImplementation((data) => data); // Assume correct data creation
        merchantRepositoryMock.save.mockRejectedValue(
          new Error('Database failure'),
        ); // Simulating a database error

        await expect(
          service.registerMerchant({
            email: 'test@test.com',
            name: 'Test User',
            password: '123456',
          }),
        ).rejects.toThrow(
          'Failed to register merchant due to an unexpected error.',
        );

        expect(merchantRepositoryMock.save).toHaveBeenCalled();
      });

      it('should successfully register a new merchant', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue(undefined);
        merchantRepositoryMock.create.mockImplementation((data) => data);
        merchantRepositoryMock.save.mockResolvedValue({
          id: 1,
          email: 'test@test.com',
          name: 'Test User',
        });

        const result = await service.registerMerchant({
          email: 'test@test.com',
          name: 'Test User',
          password: 'test pass',
        });

        expect(result).toEqual({
          id: 1,
          email: 'test@test.com',
          name: 'Test User',
        });
      });
    });

    describe('loginUser', () => {
      const loginDto = { email: 'user@example.com', password: 'password123' };

      it('should throw if merchant does not exist', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue(null);
        await expect(service.loginUser(loginDto)).rejects.toThrow(
          HttpException,
        );
      });

      it('should throw if password is incorrect', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue({
          email: 'user@example.com',
          password: await bcrypt.hash('password1234', salt_rounds),
        });

        await expect(service.loginUser(loginDto)).rejects.toThrow(
          'Merchant not exists or wrong password.',
        );
      });

      it('should return user details if login is successful', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue({
          id: 1,
          email: 'user@example.com',
          password: await bcrypt.hash('password123', salt_rounds),
        });

        const result = await service.loginUser(loginDto);
        expect(result).toEqual({ user: { id: 1, email: 'user@example.com' } });
      });
    });

    describe('updateMerchantAccount', () => {
      it('should throw if merchant does not exist', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue(null);
        await expect(
          service.updateMerchantAccount(1, {
            email: 'new@example.com',
            name: 'New Name',
            paypal_email: 'paypal@example.com',
          }),
        ).rejects.toThrow('Merchant does not exist');
      });

      it('should successfully update merchant data', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue({ id: 1 });
        merchantRepositoryMock.update.mockResolvedValue({ affected: 1 });

        const result = await service.updateMerchantAccount(1, {
          email: 'new@example.com',
          name: 'New Name',
          paypal_email: 'paypal@example.com',
        });
        expect(result).toEqual({ affected: 1 });
      });
    });

    describe('deleteMerchantAccount', () => {
      it('should throw if merchant does not exist', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue(null);
        await expect(service.deleteMerchantAccount(1)).rejects.toThrow(
          'Merchant to delete does not exist',
        );
      });

      it('should successfully delete a merchant', async () => {
        merchantRepositoryMock.findOne.mockResolvedValue({ id: 1 });
        merchantRepositoryMock.delete.mockResolvedValue({ affected: 1 });

        const result = await service.deleteMerchantAccount(1);
        expect(result).toEqual({ affected: 1 });
      });
    });
  });
});
