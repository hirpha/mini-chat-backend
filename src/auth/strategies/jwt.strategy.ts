import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

interface JwtPayload {
  phoneNumber: string; // (or whatever your JWT payload contains)
  sub?: string; // Optional user ID (standard JWT field)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
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

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.authService.validateUser(payload.phoneNumber);
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }
    return user; // Becomes `request.user`
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {} // Uses the 'jwt' strategy
