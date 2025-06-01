import { IsPhoneNumber, IsNotEmpty } from 'class-validator';

export class PhoneSignupDto {
  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;
}
