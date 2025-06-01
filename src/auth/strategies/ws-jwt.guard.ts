import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake.auth.token;

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.authService.validateUser(payload.phoneNumber);
      client.user = user;
      return true;
    } catch (err) {
      throw new WsException('Invalid credentials');
    }
  }
}
