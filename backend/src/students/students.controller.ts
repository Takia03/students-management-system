
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';

import {
 BadRequestException,
 MaxFileSizeValidator,
 ParseFilePipe,
 UploadedFile,
 UseInterceptors,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PaginationDto } from './dto/pagination.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
  ) {}

  // GET /students?page=0&limit=10
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.studentsService.findAll(
      paginationDto.page,
      paginationDto.limit,
      paginationDto.sortBy,
      paginationDto.sortOrder,
    );
  }

  // GET /students/search?q=takia&page=0&limit=10
  @Get('search')
  search(
    @Query('q') q: string = '',
    @Query() paginationDto: PaginationDto,
  ) {
    return this.studentsService.search(
      q,
      paginationDto.page,
      paginationDto.limit,
      paginationDto.sortBy,
      paginationDto.sortOrder,
    );
  }


  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024})],
      }),
    )
    file: Express.Multer.File,
  ){
    if(!file){
      throw new BadRequestException('Upload an Excel file using the "file" field.');
    }
    return this.studentsService.importExcel(file.buffer, file.originalname);
  }


  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewExcel(@UploadedFile() file : Express.Multer.File){
    if(!file) {
      throw new BadRequestException(
        'Upload an Excel file.',
      );
    }

    return this.studentsService.previewExcel(file.buffer, file.originalname);
  }

  @Post('import/confirm')
  confirmImport(
    @Body() rows: { row: number; name: string; email: string }[],
  ) {
    return this.studentsService.confirmImport(rows);
  }

  // GET /students/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  // POST /students
  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  // PUT /students/:id
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(
      id,
      updateStudentDto,
    );
  }

  // PATCH /students/:id
  @Patch(':id')
  partialUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(
      id,
      updateStudentDto,
    );
  }

  // DELETE /students/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}
