import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Merchant } from './Merchant';

export enum TransactionType {
  PAY_IN = 'pay_in',
  PAY_OUT = 'pay_out',
}

@Entity({ name: 'merchant_transactions' })
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  sender_address: string;

  @Column()
  amount: number;

  @Column()
  currency: string;

  @Column({ nullable: true })
  transaction_time: string;

  @Column()
  transaction_status: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transaction_type: TransactionType;

  @ManyToOne(() => Merchant, (merchant) => merchant.transactions)
  merchant: Merchant;
}
