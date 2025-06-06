import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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
