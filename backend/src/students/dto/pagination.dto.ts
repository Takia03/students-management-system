
import { Type } from 'class-transformer';
import {
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page: number = 0;


  @IsIn(['id', 'name', 'email', 'created_at'])
  sortBy : string = 'created_at';

  @IsIn (['asc', 'desc'])
  sortOrder : string = 'desc';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
