import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OTP } from './entities/otp.entity';
import { UsersService } from '../users/users.service';
import { PhoneSignupDto } from './dto/phone-signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { generateOTP } from '../common/helpers/otp.helper';
import { normalizePhoneNumber } from '../common/helpers/phone.helper';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(OTP)
    private otpRepository: Repository<OTP>,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async requestOtp(phoneSignupDto: PhoneSignupDto): Promise<void> {
    const phoneNumber = normalizePhoneNumber(phoneSignupDto.phoneNumber);

    // Invalidate any existing OTPs
    await this.otpRepository.update(
      { phoneNumber, isUsed: false },
      { isUsed: true },
    );

    // Generate new OTP
    const otpCode = generateOTP(6);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiration

    // Save OTP
    const otp = this.otpRepository.create({
      phoneNumber,
      code: await bcrypt.hash(otpCode, 10),
      expiresAt,
    });

    await this.otpRepository.save(otp);

    // In production, send via SMS service
    console.log(`OTP for ${phoneNumber}: ${otpCode}`);
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const phoneNumber = normalizePhoneNumber(verifyOtpDto.phoneNumber);

    const otp = await this.otpRepository.findOne({
      where: {
        phoneNumber,
        isUsed: false,
        expiresAt: new Date(),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const isValid = await bcrypt.compare(verifyOtpDto.code, otp.code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark OTP as used
    otp.isUsed = true;
    await this.otpRepository.save(otp);

    // Find or create user
    let user = await this.usersService.findByPhoneNumber(phoneNumber);
    if (!user) {
      user = await this.usersService.create(phoneNumber);
    }

    // Mark as verified if not already
    if (!user.isVerified) {
      user = await this.usersService.markAsVerified(user.id);
    }

    return this.generateTokens(user);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
    accessToken: string;
  }> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return {
        accessToken: this.jwtService.sign({
          sub: user.id,
          phoneNumber: user.phoneNumber,
        }),
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(phoneNumber: string): Promise<User> {
    const user = await this.usersService.findByPhoneNumber(phoneNumber);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
