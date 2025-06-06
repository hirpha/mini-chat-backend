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
import { ConfigService } from '@nestjs/config';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users
  private connectedUsers: Map<string, Socket[]> = new Map();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticateClient(client);

      // Add user to connected users map
      this.addConnectedUser(user.id, client);

      // Update last active time
      await this.usersService.updateLastActive(user.id, new Date());

      client.join(user.id);
      client.join('all');

      // Notify others that this user is online
      this.server.emit('userOnline', { userId: user.id });
      this.usersService.changeToOnline(user.id);

      console.log(`Client connected: ${user.id}`);
    } catch (error) {
      console.error('Authentication failed:', error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const user = await this.authenticateClient(client);

      // Remove client from connected users
      this.removeConnectedUser(user.id, client);

      // If no more connections for this user, mark as offline
      if (!this.connectedUsers.has(user.id)) {
        await this.usersService.updateLastActive(user.id, new Date());
        this.server.emit('userOffline', { userId: user.id });
        this.usersService.changeToOffline(user.id);
      }

      console.log(`Client disconnected: ${user.id}`);
    } catch (error) {
      console.error('Error during disconnect:', error.message);
    }
  }

  // Add a connected user
  private addConnectedUser(userId: string, client: Socket) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    this.connectedUsers.get(userId).push(client);
  }

  // Remove a connected user
  private removeConnectedUser(userId: string, client: Socket) {
    const userClients = this.connectedUsers.get(userId);
    if (userClients) {
      const index = userClients.indexOf(client);
      if (index > -1) {
        userClients.splice(index, 1);
      }
      if (userClients.length === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  // Check if a user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get all online users
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // ... rest of your existing code ...

  // @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() createMessageDto: CreateMessageDto,

    @ConnectedSocket() client: Socket,
  ) {
    const user = await this.authenticateClient(client);
    if (!user) {
      throw new Error('User not authenticated');
    }
    console.log;
    console.log('Received message:', createMessageDto);

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
    const authToken = client.handshake.auth?.token;

    if (!authToken) {
      throw new Error('Authentication token not provided');
    }

    try {
      // Reuse JwtStrategy logic
      const payload = this.jwtService.verify(authToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Validate user (same as in JwtStrategy)
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      throw new Error('Invalid authentication token');
    }
  }
}
