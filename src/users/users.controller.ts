import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // In your controller
  // @UseGuards(JwtAuthGuard)
  @Get('chat-contacts')
  async getChatUsers(@CurrentUser() user: User) {
    console.log(user);
    const currentUserId = user.id;
    return this.usersService.getUsersWithLatestMessage(currentUserId);
  }

  // @Get('me')
  // async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto> {
  //   await this.usersService.updateLastActive(user.id);
  //   return this.usersService.toUserResponseDto(user);
  // }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    return this.usersService.toUserResponseDto(user);
  }

  @Patch('me')
  async update(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.update(user.id, updateUserDto);
    return this.usersService.toUserResponseDto(updatedUser);
  }

  @Get()
  async searchUsers(@Query('query') query: string): Promise<UserResponseDto[]> {
    const users = await this.usersService.searchUsers(query);
    return users.map((user) => this.usersService.toUserResponseDto(user));
  }
}
