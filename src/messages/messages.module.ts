import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message } from './entities/message.entity';
import { UsersModule } from '../users/users.module';
import { ChatGateway } from './gateways/chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), UsersModule, AuthModule],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    ChatGateway,
    ChatGateway,
    JwtService,
    UsersService,
  ],
  exports: [MessagesService],
})
export class MessagesModule {}
