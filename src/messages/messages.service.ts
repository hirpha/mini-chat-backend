import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async create(
    sender: User,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    const message = this.messagesRepository.create({
      content: createMessageDto.content,
      sender,
      receiver: { id: createMessageDto.receiverId },
    });

    return this.messagesRepository.save(message);
  }

  async findMessageById(id: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: ['sender', 'receiver'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  async getConversation(
    userId: string,
    otherUserId: string,
    limit: number = 50,
    before?: Date,
  ): Promise<MessageResponseDto[]> {
    const query = this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where(
        `
        (message.senderId = :userId AND message.receiverId = :otherUserId) OR
        (message.senderId = :otherUserId AND message.receiverId = :userId)
      `,
        { userId, otherUserId },
      )
      .orderBy('message.createdAt', 'DESC')
      .limit(limit);

    if (before) {
      query.andWhere('message.createdAt < :before', { before });
    }

    const messages = await query.getMany();

    return messages.map((message) => this.toMessageResponseDto(message));
  }

  async markAllAsRead(userId: string, otherUserId: string): Promise<void> {
    console.log('userId', userId, 'otherUserId', otherUserId);
    const messages = await this.messagesRepository.find({
      where: { receiver: { id: userId }, sender: { id: otherUserId } },
    });
    if (messages.length === 0) {
      return;
    }
    for (const message of messages) {
      message.isRead = true;
      message.readAt = new Date();
      await this.messagesRepository.save(message);
    }

    return;
  }
  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.findMessageById(messageId);

    if (message.receiver.id !== userId) {
      throw new ForbiddenException(
        'You can only mark your own messages as read',
      );
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      return this.messagesRepository.save(message);
    }
    return message;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messagesRepository.count({
      where: {
        receiver: { id: userId },
        isRead: false,
      },
    });
  }

  toMessageResponseDto(message: any): MessageResponseDto {
    const _message = {
      id: message.id,
      content: message.content,
      senderId: message.sender.id,
      receiverId: message.receiver.id,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        avatar: message.sender.avatar,
        phoneNumber: message.sender.phoneNumber,
      },
      receiver: {
        id: message.receiver.id,
        name: message.receiver.name,
        avatar: message.receiver.avatar,
        phoneNumber: message.receiver.phoneNumber,
      },
      createdAt: message.createdAt,
      isRead: message.isRead,
      readAt: message.readAt,
    };
    console.log(_message);
    return _message;
  }
}
