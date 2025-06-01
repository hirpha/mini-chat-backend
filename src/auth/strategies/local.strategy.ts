import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalAuthGuard extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'phoneNumber' });
  }

  async validate(phoneNumber: string): Promise<any> {
    const user = await this.authService.validateUser(phoneNumber);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
