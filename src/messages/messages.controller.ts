import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.create(user, createMessageDto);
    return this.messagesService.toMessageResponseDto(message);
  }

  @Get('conversation/:userId')
  async getConversation(
    @CurrentUser() user: User,
    @Param('userId') otherUserId: string,
    @Query('limit') limit: number = 50,
    @Query('before') before?: string,
  ): Promise<MessageResponseDto[]> {
    const beforeDate = before ? new Date(before) : undefined;
    return this.messagesService.getConversation(
      user.id,
      otherUserId,
      limit,
      beforeDate,
    );
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') messageId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.markAsRead(messageId, user.id);
    return this.messagesService.toMessageResponseDto(message);
  }

  @Patch('all/read/:otherUserId')
  async markAllAsRead(
    @CurrentUser() user: User,
    @Param('otherUserId') otherUserId: string,
  ): Promise<void> {
    await this.messagesService.markAllAsRead(user.id, otherUserId);
  }

  @Get('unread/count')
  async getUnreadCount(@CurrentUser() user: User): Promise<{ count: number }> {
    const count = await this.messagesService.getUnreadCount(user.id);
    return { count };
  }
}
