import { IsPhoneNumber, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;
}
