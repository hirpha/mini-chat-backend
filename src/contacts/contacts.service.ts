import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
// import { SyncContactsDto } from './dto/sync-contacts.dto';
import { UserContactDto } from './dto/user-contact.dto';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Message } from '../messages/entities/message.entity';
@Injectable()
export class ContactsService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}
  // async syncContacts(
  //   phoneNumbers: string[],
  //   currentUserId: string,
  // ): Promise<UserContactDto[]> {
  //   // Normalize phone numbers (remove formatting)
  //   const normalizedNumbers = phoneNumbers.map((num) => num.replace(/\D/g, ''));

  //   // Find registered users
  //   const registeredUsers =
  //     await this.usersService.findByPhoneNumbers(normalizedNumbers);

  //   // Map to response DTO
  //   return registeredUsers
  //     .filter((user) => user.id !== currentUserId)
  //     .map((user) => ({
  //       id: user.id,
  //       phoneNumber: user.phoneNumber,
  //       name: user.name || null,
  //       avatar: user.avatar || null,
  //       isRegistered: true,
  //       lastActiveAt: user.lastActiveAt || null,
  //     }));
  // }
  async syncContacts(
    phoneNumbers: string[],
    currentUserId: string,
  ): Promise<UserContactDto[]> {
    // Normalize phone numbers
    const normalizedNumbers = phoneNumbers.map((num) => num.replace(/\D/g, ''));

    // 1. Find registered users from contacts
    const registeredContacts =
      await this.usersService.findByPhoneNumbers(normalizedNumbers);

    // 2. Find users who messaged me but aren't in my contacts
    const messagingUsers = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.receiverId = :currentUserId', { currentUserId })
      .andWhere('message.senderId != :currentUserId', { currentUserId })
      .select(['DISTINCT sender.id as id'])
      .getRawMany();

    const messagingUserIds = messagingUsers.map((user) => user.id);

    // Get these users' details (excluding those already in contacts)
    const additionalUsers =
      messagingUserIds.length > 0
        ? await this.usersService.findByIds(
            messagingUserIds.filter(
              (id) => !registeredContacts.some((contact) => contact.id === id),
            ),
          )
        : [];

    // Combine both lists (contacts + messaging users)
    const allRelevantUsers = [...registeredContacts, ...additionalUsers];

    // Process all users
    const contactPromises = allRelevantUsers
      .filter((user) => user.id !== currentUserId)
      .map(async (user) => {
        const [lastMessage, unreadCount] = await Promise.all([
          // Get last message
          this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .leftJoinAndSelect('message.receiver', 'receiver')
            .where(
              '(message.senderId = :currentUserId AND message.receiverId = :contactId) OR ' +
                '(message.senderId = :contactId AND message.receiverId = :currentUserId)',
              { currentUserId, contactId: user.id },
            )
            .orderBy('message.createdAt', 'DESC')
            .getOne(),

          // Get unread count
          this.messageRepository
            .createQueryBuilder('message')
            .where(
              'message.receiverId = :currentUserId AND ' +
                'message.senderId = :contactId AND ' +
                'message.isRead = false',
              { currentUserId, contactId: user.id },
            )
            .getCount(),
        ]);
        console.log('lastMessage: ', lastMessage);
        return {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name || null,
          avatar: user.avatar || null,
          isRegistered: true,
          isInContacts: registeredContacts.some((c) => c.id === user.id), // Flag for contact status
          lastActiveAt: user.lastActiveAt || null,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                isFromMe: lastMessage.sender.id === currentUserId,
              }
            : null,
          unreadCount,
        };
      });

    return Promise.all(contactPromises);
  }
  async getContactsForUser(userId: string): Promise<UserContactDto[]> {
    // In a real app, you might implement actual contact relationships here
    // For now, we'll return an empty array
    return [];
  }
}
