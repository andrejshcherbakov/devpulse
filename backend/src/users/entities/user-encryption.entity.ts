import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';

import { User } from './user.entity';

@Entity('user_encryption')
export class UserEncryption extends AppBaseEntity<'encryption'> {
  @OneToOne(() => User, (user) => user.encryption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user!: User;

  @Column({ type: 'text', nullable: true })
  public clientPublicKey: string | null = null;

  @Column({ type: 'text', nullable: true })
  public serverPrivateKey: string | null = null;

  @Column({ type: 'text', nullable: true })
  public salt: string | null = null;

  @Column({ type: 'text', nullable: true })
  public verifier: string | null = null;

  @Column({ type: 'text', nullable: true })
  public publicKey: string | null = null;

  @Column({ type: 'text', nullable: true })
  public encryptedPrivateKey: string | null = null;

  @Column({ type: 'text', nullable: true })
  public iv: string | null = null;

  @Column({ type: 'text', nullable: true })
  public tag: string | null = null;

  @Column({ type: 'text', nullable: true })
  public protectedKey: string | null = null;

  @Column({ type: 'text', nullable: true })
  public protectedKeyIV: string | null = null;

  @Column({ type: 'text', nullable: true })
  public protectedKeyTag: string | null = null;
}
