import { useCallback, useEffect, useState } from 'react';
import {
  createStudent,
  deleteStudent,
  getStudents,
  patchStudent,
  searchStudents,
  updateStudent,
} from '@/api/studentsApi';
import type { StudentSortField, SortOrder } from '@/api/studentsApi';
import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from '@/types/student';

export default function useStudents(
  query = '',
  page = 0,
  pageSize = 10,
  sortBy: StudentSortField = 'created_at',
  sortOrder: SortOrder = 'desc',
) {
  const [rows, setRows] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const q = query.trim();
        const data = q
          ? await searchStudents(q, page, pageSize, controller.signal, sortBy, sortOrder)
          : await getStudents(page, pageSize, controller.signal, sortBy, sortOrder);
        setRows(data.data);
        setTotal(data.total);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, pageSize, sortBy, sortOrder, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const addStudent = useCallback(async (student: CreateStudentInput) => {
    const created = await createStudent(student);
    reload();
    return created;
  }, [reload]);

  const editStudent = useCallback(async (id: number, student: CreateStudentInput) => {
    const updated = await updateStudent(id, student);
    reload();
    return updated;
  }, [reload]);

  const changeStudent = useCallback(async (id: number, changes: UpdateStudentInput) => {
    const updated = await patchStudent(id, changes);
    reload();
    return updated;
  }, [reload]);

  const removeStudent = useCallback(async (id: number) => {
    const result = await deleteStudent(id);
    reload();
    return result;
  }, [reload]);

  return { rows, total, loading, error, reload, addStudent, editStudent, changeStudent, removeStudent };
}
