import { IsArray, IsString, IsPhoneNumber } from 'class-validator';

export class SyncContactsDto {
  @IsArray()
  @IsString({ each: true })
  @IsPhoneNumber(null, { each: true }) // Validate each phone number
  phoneNumbers: string[];
}
