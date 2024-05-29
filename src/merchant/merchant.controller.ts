import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { RegisterMerchantDto } from 'src/dto/registerMerchant.dto';
import { Response } from 'express';
import { LoginMerchantDto } from 'src/dto/loginMerchant.dto';
import { UpdateMerchantDto } from 'src/dto/updateMerchant.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('merchant')
export class MerchantController {
  constructor(private merchantService: MerchantService) {}

  @Post('register')
  async registerMerchant(
    @Body() registerMerchantDto: RegisterMerchantDto,
    @Res() res: Response,
  ): Promise<any> {
    const register_merchant =
      await this.merchantService.registerMerchant(registerMerchantDto);

    return res.status(HttpStatus.CREATED).send({
      status: true,
      data: register_merchant,
      message: 'Account was created successfully.',
    });
  }

  @Post('login')
  async merchantLogin(
    @Body() loginMerchantDto: LoginMerchantDto,
    @Res() res: Response,
  ): Promise<any> {
    const login_merchant =
      await this.merchantService.loginUser(loginMerchantDto);

    const jwt = await this.merchantService.generateJWT(loginMerchantDto);

    return res.status(HttpStatus.CREATED).send({
      status: true,
      data: { access_token: jwt },
      message: 'Login successful.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateMerchantDetails(
    @Param() id: number,
    @Body() updateMerchantDto: UpdateMerchantDto,
    @Res() res: Response,
  ): Promise<any> {
    const update_merchant = await this.merchantService.updateMerchantAccount(
      id,
      updateMerchantDto,
    );

    return res.status(HttpStatus.CREATED).send({
      status: true,
      data: update_merchant,
      message: 'Merchant Update successful.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteMerchant(
    @Param() id: number,
    @Res() res: Response,
  ): Promise<any> {
    const delete_merchant =
      await this.merchantService.deleteMerchantAccount(id);

    return res.status(HttpStatus.CREATED).send({
      status: true,
      data: delete_merchant,
      message: 'Merchant DELETED successfully.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('deposit-history/:id')
  async getMerchantDepositHistory(
    @Param() id: number,
    @Res() res: Response,
  ): Promise<any> {
    const deposit_history = await this.merchantService.getMerchantDeposits(id);

    return res.status(HttpStatus.CREATED).send({
      status: true,
      data: deposit_history,
      message: 'Merchant history fetched successfully.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('settlement-history/:id')
  async getMerchantSettlementHistory(
    @Param() id: number,
    @Res() res: Response,
  ): Promise<any> {
    const settlement_history =
      await this.merchantService.getMerchantPayouts(id);

    return res.status(HttpStatus.CREATED).send({
      status: true,
      data: settlement_history,
      message: 'Merchant history fetched successfully.',
    });
  }
}
