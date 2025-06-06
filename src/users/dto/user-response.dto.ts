import { Expose, Type } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  name: string;

  @Expose()
  avatar: string;

  @Expose()
  isVerified: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  lastActiveAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => String)
  status?: 'online' | 'offline';
}
