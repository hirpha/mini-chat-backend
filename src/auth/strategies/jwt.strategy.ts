import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: RequestWithUser) => {
          // Now properly typed
          return (
            request?.cookies?.access_token ||
            request?.headers?.authorization?.split(' ')[1]
          );
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any): Promise<User> {
    const user = await this.authService.validateUser(payload.phoneNumber);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

// The guard remains unchanged
export class JwtAuthGuard extends PassportStrategy(JwtStrategy) {}
