import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SyncContactsDto } from './dto/sync-contacts.dto';
import { UserContactDto } from './dto/user-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly usersService: UsersService) {}

  async syncContacts(
    phoneNumbers: string[],
    currentUserId: string,
  ): Promise<UserContactDto[]> {
    // Normalize phone numbers (remove formatting)
    const normalizedNumbers = phoneNumbers.map((num) => num.replace(/\D/g, ''));

    // Find registered users
    const registeredUsers =
      await this.usersService.findByPhoneNumbers(normalizedNumbers);

    // Map to response DTO
    return registeredUsers
      .filter((user) => user.id !== currentUserId)
      .map((user) => ({
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name || null,
        avatar: user.avatar || null,
        isRegistered: true,
        lastActiveAt: user.lastActiveAt || null,
      }));
  }

  async getContactsForUser(userId: string): Promise<UserContactDto[]> {
    // In a real app, you might implement actual contact relationships here
    // For now, we'll return an empty array
    return [];
  }
}
