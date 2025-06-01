import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as os from 'os';

function getLocalIp(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const port = 3000;
  const ip = getLocalIp() || '0.0.0.0'; // fallback to all interfaces

  const server = await app.listen(port, ip);

  const address = server.address();
  if (typeof address === 'string') {
    console.log(`Application is running on ${address}`);
  } else if (address) {
    console.log(
      `Application is running on http://${address.address}:${address.port}`,
    );
  } else {
    console.log(`Application is running on port ${port}`);
  }
}
bootstrap();
