// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const port = parseInt(process.env.PORT || '', 10);
  if (!port) {
    console.error('⚠️  $PORT is not defined');
    process.exit(1);
  }

  await app.listen(port, '0.0.0.0');
  console.log(`🚀  Application is running on port ${port}`);
}

bootstrap();
