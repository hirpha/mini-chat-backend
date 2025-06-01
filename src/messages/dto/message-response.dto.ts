import { Expose, Type } from 'class-transformer';

class UserInfoDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  avatar: string;
}

export class MessageResponseDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  @Type(() => UserInfoDto)
  sender: UserInfoDto;

  @Expose()
  @Type(() => UserInfoDto)
  receiver: UserInfoDto;

  @Expose()
  createdAt: Date;

  @Expose()
  isRead: boolean;

  @Expose()
  readAt: Date | null;
}
