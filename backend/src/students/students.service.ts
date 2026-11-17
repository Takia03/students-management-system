import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PG_POOL } from '../database/database.module';
import { CreateStudentDto } from './dto/create-student.dto';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { validate, Validate } from 'class-validator';
import * as XLSX from 'xlsx';
import { randomBytes } from 'crypto';
import {hash} from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';


type ImportRow = {
  row: number;
  name: string;
  email: string;
  reasons: string[];
};

@Injectable()
export class StudentsService {
  async importExcel(buffer: Buffer, originalName: string) {
    const parsed = await this.parseAndValidateExcel(buffer, originalName);
    const invalidRows = parsed.filter((item) => item.reasons.length > 0);
    const validRows = parsed
      .filter((item) => item.reasons.length === 0)
      .map(({ row, name, email }) => ({ row, name, email }));

    const result = await this.confirmImport(validRows);
    const errors = [
      ...invalidRows.map((item) => ({
        row: item.row,
        reason: item.reasons.join(', '),
      })),
      ...result.errors,
    ];

    return {
      ...result,
      failedCount: errors.length,
      skippedCount: errors.length,
      errors,
    };
  }
  private async parseAndValidateExcel(
    buffer: Buffer,
    originalName: string,
  ): Promise<ImportRow[]> {
    const extension = originalName.split('.').pop()?.toLowerCase();

    if (!extension || !['xlsx', 'xls'].includes(extension)) {
      throw new ConflictException('Only .xlsx and .xls files are supported.');
    }

    let rows: unknown[][];

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = worksheet
        ? (XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
          }) as unknown[][])
        : [];
    } catch {
      throw new ConflictException(
        'The uploaded file could not be read as an Excel workbook.',
      );
    }

    if (rows.length < 2) {
      throw new ConflictException(
        'The worksheet must contain a header row and at least one data row.',
      );
    }

    const headers = rows[0].map((value) => String(value).trim().toLowerCase());
    const nameIndex = headers.indexOf('name');
    const emailIndex = headers.indexOf('email');

    if (nameIndex === -1 || emailIndex === -1) {
      throw new ConflictException(
        'The first row must contain "name" and "email" columns.',
      );
    }

    const parsed: ImportRow[] = [];
    const seenEmails = new Set<string>();

    for (let index = 1; index < rows.length; index += 1) {
      const cells = rows[index];
      const name = String(cells[nameIndex] ?? '').trim();
      const email = String(cells[emailIndex] ?? '').trim().toLowerCase();

      // Ignore completely blank spreadsheet rows.
      if (!name && !email) continue;

      const dto = Object.assign(new CreateStudentDto(), { name, email });
      const validationErrors = await validate(dto);
      const reasons = validationErrors.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );

      if (email && seenEmails.has(email)) {
        reasons.push(`Duplicate email in this file: ${email}`);
      }
      if (email) seenEmails.add(email);

      parsed.push({
        row: index + 1, // First data row is Excel row 2.
        name,
        email,
        reasons,
      });
    }

    // Include conflicts that already exist in either table.
    const emails = parsed.map((item) => item.email).filter(Boolean);

    if (emails.length > 0) {
      const result = await this.pool.query<{ email: string }>(
        `SELECT email FROM students WHERE email = ANY($1::text[])
         UNION
         SELECT email FROM users WHERE email = ANY($1::text[])`,
        [emails],
      );

      const existingEmails = new Set(
        result.rows.map((item) => item.email.toLowerCase()),
      );

      for (const item of parsed) {
        if (existingEmails.has(item.email)) {
          item.reasons.push(`Email already exists: ${item.email}`);
        }
      }
    }

    return parsed;
  }
  // //data
  // private students = [
  //     { id: 1, name: 'John Doe', age: 20 },
  //     { id: 2, name: 'Jane Smith', age: 22 },
  //     { id: 3, name: 'Michael Johnson', age: 21 },
  // ];

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly usersService : UsersService,
    private readonly mailService : MailService,
  ) {}

  private handleDbError(err: unknown): never {
    const e = err as { code?: string; constraint?: string };
    if (e.code === '23505' && e.constraint === 'students_email_key') {
      throw new ConflictException('Email already exists');
    }
    throw err;
  }

  async findAll(
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: string,
  ) {
    const offset = page * limit;
    const orderBy = this.getOrderBy(sortBy, sortOrder);

    const [result, count] = await Promise.all([
      this.pool.query(
        `SELECT * FROM students ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      this.pool.query('SELECT COUNT(*)::int AS total FROM students'),
    ]);

    return { data: result.rows, total: count.rows[0].total as number };
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      'SELECT * FROM students WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }
    return result.rows[0];
  }

  async create(createStudentDto: CreateStudentDto) {
    try {
      const result = await this.pool.query(
        'INSERT INTO students (name, email) VALUES ($1, $2) RETURNING *',
        [createStudentDto.name, createStudentDto.email],
      );
      return result.rows[0];
    } catch (err) {
      this.handleDbError(err);
    }
  }

  async update(id: number, updateStudentDto: Partial<CreateStudentDto>) {
    try {
      const result = await this.pool.query(
        'UPDATE students SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING *',
        [updateStudentDto.name, updateStudentDto.email, id],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      return result.rows[0];
    } catch (err) {
      this.handleDbError(err);
    }
  }

  async remove(id: number) {
    const result = await this.pool.query(
      'DELETE FROM students WHERE id = $1 RETURNING *',
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }
    return result.rows[0];
  }

  async search(
    q: string,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: string,
  ) {
    const pattern = `%${q}%`;
    const offset = page * limit;
    const orderBy = this.getOrderBy(sortBy, sortOrder);

    const [result, count] = await Promise.all([
      this.pool.query(
        `SELECT * FROM students WHERE id::text ILIKE $1 OR name ILIKE $1 OR email ILIKE $1 ORDER BY ${orderBy} LIMIT $2 OFFSET $3`,
        [pattern, limit, offset],
      ),
      this.pool.query(
        'SELECT COUNT(*)::int AS total FROM students WHERE id::text ILIKE $1 OR name ILIKE $1 OR email ILIKE $1',
        [pattern],
      ),
    ]);
    return { data: result.rows, total: count.rows[0].total as number };
  }

  private getOrderBy(sortBy: string, sortOrder: string): string {
    const allowedColumns: Record<string, string> = {
      id: 'id',
      name: 'name',
      email: 'email',
      created_at: 'created_at',
    };

    const column = allowedColumns[sortBy] ?? 'created_at';
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';

    return `${column} ${direction}, id DESC`;
  }

  private parsePage(value?: string): number {
    const page = Number(value ?? 0);
    return Number.isInteger(page) && page >= 0 ? page : 0;
  }

  private parsePageSize(value?: string): number {
    const size = Number(value ?? 10);
    return Number.isInteger(size) && size >= 1 && size <= 100 ? size : 10;
  }

async previewExcel(buffer: Buffer, originalName: string) {
  const parsed = await this.parseAndValidateExcel(buffer, originalName);

  const rows = parsed.map((item) => ({
    ...item,
    valid: item.reasons.length === 0,
  }));

  return {
    rows,
    validCount: rows.filter((item) => item.valid).length,
    invalidCount: rows.filter((item) => !item.valid).length,
  };
}

async confirmImport(
  rows: { row: number; name: string; email: string }[],
) {
  const imported: { id: number; name: string; email: string }[] = [];
  const errors: { row: number; reason: string }[] = [];
  const emailErrors: { row: number; email: string; reason: string }[] = [];

  for (const item of rows) {
    const name = item.name.trim();
    const email = item.email.trim().toLowerCase();

    // Recheck DTO rules at confirmation time.
    const dto = Object.assign(new CreateStudentDto(), { name, email });
    const validationErrors = await validate(dto);

    if (validationErrors.length > 0) {
      errors.push({
        row: item.row,
        reason: validationErrors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .join(', '),
      });
      continue;
    }

    try {
      const temporaryPassword = randomBytes(32).toString('base64url');
      const passwordHash = await hash(temporaryPassword, 10);
      const user = await this.usersService.create(name, email, passwordHash);

      imported.push({
        id: user.id,
        name: user.name,
        email: user.email,
      });

      try {
        const recipientEmail = await this.usersService.findEmailById(user.id);

        if (!recipientEmail) {
          throw new Error('Could not retrieve the account email address.');
        }

        await this.mailService.sendImportedStudentCredentials(
          recipientEmail,
          name,
          temporaryPassword,
        );
      } catch (error) {
        const smtpError = error as {
          code?: string;
          command?: string;
          responseCode?: number;
        };

        emailErrors.push({
          row: item.row,
          email: user.email,
          reason: [
            'Account was created, but the welcome email could not be sent.',
            smtpError.code ? `SMTP code: ${smtpError.code}.` : '',
            smtpError.responseCode
              ? `SMTP response: ${smtpError.responseCode}.`
              : '',
            smtpError.command ? `SMTP command: ${smtpError.command}.` : '',
          ]
            .filter(Boolean)
            .join(' '),
        });
      }
    } catch (error) {
      const dbError = error as { code?: string; constraint?: string };

      if (
        dbError.code === '23505' &&
        (dbError.constraint === 'users_email_key' ||
          dbError.constraint === 'students_email_key')
      ) {
        errors.push({
          row: item.row,
          reason: `Email already exists: ${email}`,
        });
      } else {
        errors.push({
          row: item.row,
          reason:
            error instanceof Error
              ? error.message
              : 'Could not create student account.',
        });
      }
    }
  }

  return {
    importedCount: imported.length,
    skippedCount: errors.length,
    imported,
    errors,
    emailErrors,
  };
}
}
