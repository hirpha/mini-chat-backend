import { Expose } from 'class-transformer';

export class UserContactDto {
  @Expose()
  id: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  name: string | null;

  @Expose()
  avatar: string | null;

  @Expose()
  isRegistered: boolean;

  @Expose()
  lastActiveAt: Date | null;
}
