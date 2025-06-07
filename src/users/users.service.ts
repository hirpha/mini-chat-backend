import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserContactDto } from 'src/contacts/dto/user-contact.dto';
import { Message } from 'src/messages/entities/message.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async create(phoneNumber: string): Promise<User> {
    const user = this.usersRepository.create({ phoneNumber });
    return this.usersRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids })
      .getMany();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phoneNumber } });
  }

  async findByPhoneNumbers(phoneNumbers: string[]): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.phoneNumber IN (:...phoneNumbers)', { phoneNumbers })
      .getMany();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async markAsVerified(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isVerified = true;
    return this.usersRepository.save(user);
  }

  async updateLastActive(userId: string, date: Date): Promise<void> {
    await this.usersRepository.update(userId, { lastActiveAt: date });
  }

  async changeToOffline(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { isOnline: false });
  }

  async changeToOnline(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { isOnline: true });
  }

  async getOnlineStatus(
    userId: string,
  ): Promise<{ isOnline: boolean; lastActiveAt: Date }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // You might want to adjust this threshold (e.g., 5 minutes)
    const isOnline = user.lastActiveAt
      ? new Date().getTime() - user.lastActiveAt.getTime() < 5 * 60 * 1000
      : false;

    return {
      isOnline,
      lastActiveAt: user.lastActiveAt,
    };
  }

  async getUsersWithLatestMessage(
    currentUserId: string,
  ): Promise<UserContactDto[]> {
    console.log('currentUserId', currentUserId);
    // Get all distinct users who have exchanged messages with current user
    const chatUsers = await this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.phoneNumber',
        'user.name',
        'user.avatar',
        'user.isOnline',
        'user.lastActiveAt',
        'user.isVerified',
      ])
      .innerJoin(
        'messages',
        'message',
        '(message.senderId = user.id AND message.receiverId = :currentUserId) OR (message.senderId = :currentUserId AND message.receiverId = user.id)',
        { currentUserId },
      )
      .where('user.id != :currentUserId')
      .groupBy('user.id')
      .getMany();

    // For each user, get their latest message and unread count
    const result = await Promise.all(
      chatUsers.map(async (user) => {
        const [latestMessage, unreadCount] = await Promise.all([
          this.messagesRepository.findOne({
            where: [
              { sender: { id: currentUserId }, receiver: { id: user.id } },
              { sender: { id: user.id }, receiver: { id: currentUserId } },
            ],
            order: { createdAt: 'DESC' },
            relations: ['sender'],
          }),
          this.messagesRepository.count({
            where: {
              sender: { id: user.id },
              receiver: { id: currentUserId },
              isRead: false,
            },
          }),
        ]);

        return {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          avatar: user.avatar,
          isRegistered: user.isVerified,
          isInContacts: false, // Since you don't have a contacts entity
          lastActiveAt: user.lastActiveAt,
          isOnline: user.isOnline,
          unreadCount,
          lastMessage: latestMessage
            ? {
                content: latestMessage.content,
                createdAt: latestMessage.createdAt,
                isFromMe: latestMessage.sender.id === currentUserId,
              }
            : null,
        };
      }),
    );

    // Sort by latest message date (most recent first)
    return result.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt?.getTime() || 0;
      const dateB = b.lastMessage?.createdAt?.getTime() || 0;
      return dateB - dateA;
    });
  }
  async searchUsers(query: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.name ILIKE :query OR user.phoneNumber ILIKE :query', {
        query: `%${query}%`,
      })
      .limit(10)
      .getMany();
  }

  toUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
      updatedAt: user.updatedAt,
      status: this.getUserStatus(user.lastActiveAt),
    };
  }

  private getUserStatus(lastActive: Date | null): 'online' | 'offline' {
    // Handle null case - consider user offline if we don't have last active data
    if (!lastActive) {
      return 'offline';
    }

    const inactiveMinutes =
      (new Date().getTime() - lastActive.getTime()) / 60000;
    return inactiveMinutes < 5 ? 'online' : 'offline';
  }
}
