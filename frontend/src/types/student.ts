export interface Student {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

// same shape as CreateStudentDto in Nest
export interface CreateStudentInput {
  name: string;
  email: string;
}

// same idea as UpdateStudentDto (PartialType): every field optional
export type UpdateStudentInput = Partial<CreateStudentInput>;