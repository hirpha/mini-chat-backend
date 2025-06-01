import { User } from '../../users/entities/user.entity';
import { Request } from 'express';

export interface UserRequest extends Request {
  user: User;
}
