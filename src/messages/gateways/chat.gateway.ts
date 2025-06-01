import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { MessagesService } from '../messages.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { WsJwtGuard } from '../../auth/strategies/ws-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticateClient(client);
      client.join(user.id);
      client.join('all');
      console.log(`Client connected: ${user.id}`);
    } catch (error) {
      console.error('Authentication failed:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() createMessageDto: CreateMessageDto,
    @CurrentUser() user: User,
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.messagesService.create(user, createMessageDto);
    const response = this.messagesService.toMessageResponseDto(message);

    this.server.to(user.id).emit('newMessage', response);
    this.server.to(createMessageDto.receiverId).emit('newMessage', response);

    return response;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() messageId: string,
    @CurrentUser() user: User,
  ) {
    const message = await this.messagesService.markAsRead(messageId, user.id);
    return this.messagesService.toMessageResponseDto(message);
  }

  private async authenticateClient(client: Socket): Promise<User> {
    const authToken = client.handshake.auth.token;

    if (!authToken) {
      throw new Error('Authentication token not provided');
    }

    try {
      const payload = this.jwtService.verify(authToken);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }
}
