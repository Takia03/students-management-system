import {
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export type User = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  token_version: number;
};

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0];
  }

  async findById(id: number): Promise<User | undefined> {
    const result = await this.pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0];
  }

  async findProfileById(id: number) {
    const result = await this.pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.created_at,
         u.student_id,
         u.profile_image_url,
         CASE WHEN s.id IS NULL THEN NULL ELSE
           json_build_object('id', s.id, 'name', s.name, 'email', s.email)
         END AS student
       FROM users u
       LEFT JOIN students s ON s.id = u.student_id
       WHERE u.id = $1`,
      [id],
    );
    return result.rows[0];
  }

  async updateProfileImage(id: number, profileImageUrl: string) {
    const result = await this.pool.query(
      `UPDATE users
      SET profile_image_url = $2
      WHERE id = $1`,
      [id, profileImageUrl],
    );

    if (!result.rowCount) {
      throw new NotFoundException('User not found');
    }
    return this.findProfileById(id);
  }

  async getTokenVersion(id: number): Promise<number | null> {
    const result = await this.pool.query<{ token_version: number }>(
      'SELECT token_version FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0]?.token_version ?? null;
  }

  async revokeTokens(id: number): Promise<void> {
    await this.pool.query(
      'UPDATE users SET token_version = token_version + 1 WHERE id = $1',
      [id],
    );
  }

  async create(
    name: string,
    email: string,
    passwordHash: string,
  ): Promise<User> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Every user must be linked to a student in this database. Reuse an
      // existing student with this email, or create one for a new registrant.
      const insertedStudent = await client.query<{ id: number }>(
        'INSERT INTO students (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id',
        [name, email],
      );

      const student =
        insertedStudent.rows[0] ??
        (
          await client.query<{ id: number }>(
            'SELECT id FROM students WHERE email = $1',
            [email],
          )
        ).rows[0];

      if (!student) {
        throw new Error('Could not find or create the student record');
      }

      const result = await client.query<User>(
        'INSERT INTO users (student_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
        [student.id, name, email, passwordHash],
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      const e = err as { code?: string; constraint?: string };
      if (e.code === '23505' && e.constraint === 'users_email_key') {
        throw new ConflictException('Email already exists');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async addGalleryPhotos(userId: number, imageUrls: string[]) {
    if (imageUrls.length === 0) {
      return [];
    }

    const values: unknown[] = [];
    const rows = imageUrls.map((imageUrls, index) => {
      const userParam = index * 2 + 1;
      const urlParam = index * 2 + 2;
      values.push(userId, imageUrls);
      return `($${userParam}, $${urlParam})`;
    });

    const result = await this.pool.query(
      `INSERT INTO user_gallery_photos(user_id, image_url)
      VALUES ${rows.join(',')}
      RETURNING id, image_url, created_at`,
      values,
    );

    return result.rows;
  }

  async findGalleryPhotos(userId: number) {
    const result = await this.pool.query(
      `SELECT id, image_url, created_at
     FROM user_gallery_photos
     WHERE user_id = $1
     ORDER BY created_at DESC`,
      [userId],
    );

    return result.rows;
  }

  async findEmailById(id: number): Promise<string | null> {
    const result = await this.pool.query<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0]?.email ?? null;
  }

  async savePasswordResetToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE users
      SET password_reset_token_hash = $2,
        password_reset_expires_at = $3
        WHERE id = $1`,
      [userId, tokenHash, expiresAt],
    );
  }

  async resetPasswordWithToken(
    tokenHash: string,
    passwordHash: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE users
     SET password_hash = $2,
         password_reset_token_hash = NULL,
         password_reset_expires_at = NULL,
         token_version = token_version + 1
     WHERE password_reset_token_hash = $1
       AND password_reset_expires_at > NOW()
     RETURNING id`,
      [tokenHash, passwordHash],
    );

    return (result.rowCount ?? 0) === 1;
  }
}
