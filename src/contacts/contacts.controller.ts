import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { SyncContactsDto } from './dto/sync-contacts.dto';
import { UserContactDto } from './dto/user-contact.dto';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('sync')
  async syncContacts(
    @Body() syncContactsDto: SyncContactsDto,
    @CurrentUser() user: User,
  ): Promise<UserContactDto[]> {
    return this.contactsService.syncContacts(
      syncContactsDto.phoneNumbers,
      user.id,
    );
  }

  @Get()
  async getContacts(@CurrentUser() user: User): Promise<UserContactDto[]> {
    return this.contactsService.getContactsForUser(user.id);
  }
}
