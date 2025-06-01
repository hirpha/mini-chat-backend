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

  async updateLastActive(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastActiveAt: new Date() });
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
      status: this.getUserStatus(user.lastActiveAt),
    };
  }

  private getUserStatus(lastActive: Date): 'online' | 'offline' {
    const inactiveMinutes =
      (new Date().getTime() - lastActive.getTime()) / 60000;
    return inactiveMinutes < 5 ? 'online' : 'offline';
  }
}
