import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports : [UsersModule , MailModule],
  controllers: [StudentsController],
  providers: [StudentsService]
})
export class StudentsModule {}
