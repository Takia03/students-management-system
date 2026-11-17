"use client";

import { useEffect, useState, type FormEvent, useRef } from "react";
import type { GridPaginationModel, GridSortModel } from "@mui/x-data-grid";
import Dialog from "@/components/Dialog";
import SearchBar from "@/components/SearchBar";
import StudentsGrid from "@/components/StudentsGrid";
import useStudents from "@/hooks/useStudents";
import type { SortOrder, StudentSortField, ImportPreviewRow } from "@/api/studentsApi";
import type { Student } from "@/types/student";
import "./index.css";
import {
  confirmStudentImport,
  previewStudentsExcel,
} from "@/api/studentsApi";
import { Alert, Snackbar } from "@mui/material";

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "created_at", sort: "desc" },
  ]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const activeSort = sortModel[0];
  const sortBy = (activeSort?.field ?? "created_at") as StudentSortField;
  const sortOrder: SortOrder = activeSort?.sort === "asc" ? "asc" : "desc";
  const {
    rows,
    total,
    loading,
    error,
    reload,
    addStudent,
    editStudent,
    removeStudent,
  } = useStudents(
    query,
    paginationModel.page,
    paginationModel.pageSize,
    sortBy,
    sortOrder,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[] | null>(null);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importErrors, setImportErrors] = useState<
    { row: number; reason: string }[]
  >([]);
  const [emailErrors, setEmailErrors] = useState<
    { row: number; email: string; reason: string }[]
  >([]);
  const [toast, setToast] = useState<{
    severity: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const lastPage = Math.max(
      0,
      Math.ceil(total / paginationModel.pageSize) - 1,
    );
    if (paginationModel.page > lastPage) {
      setPaginationModel((current) => ({ ...current, page: lastPage }));
    }
  }, [paginationModel.page, paginationModel.pageSize, total]);

  function openEdit(student: Student) {
    setEditingStudent(student);
    setName(student.name);
    setEmail(student.email);
    setCreateError("");
  }

  function openDelete(student: Student) {
    setDeletingStudent(student);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deletingStudent) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await removeStudent(deletingStudent.id);
      setDeletingStudent(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete student.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setCreateError("");
    try {
      if (editingStudent) {
        await editStudent(editingStudent.id, {
          name: name.trim(),
          email: email.trim(),
        });
      } else {
        await addStudent({ name: name.trim(), email: email.trim() });
      }
      setName("");
      setEmail("");
      setIsCreateOpen(false);
      setEditingStudent(null);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not save student.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleExcelImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setImportMessage("");
    setImportErrors([]);
    setEmailErrors([]);
    setIsImportResultOpen(false);

    try {
      const preview = await previewStudentsExcel(file);
      setPreviewRows(preview.rows);
    } catch (err) {
      setToast({
        severity: "error",
        message: err instanceof Error ? err.message : "Could not preview the Excel file.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function confirmImport() {
    if (!previewRows) return;

    setIsImporting(true);
    try {
      const invalidRows = previewRows.filter((row) => !row.valid);
      const validRows = previewRows
        .filter((row) => row.valid)
        .map(({ row, name, email }) => ({ row, name, email }));
      const result = await confirmStudentImport(validRows);
      const skippedErrors = [
        ...invalidRows.map((row) => ({ row: row.row, reason: row.reasons.join(", ") })),
        ...result.errors,
      ];
      const skippedCount = skippedErrors.length;

      setImportErrors(skippedErrors);
      setEmailErrors(result.emailErrors ?? []);
      setImportMessage("");
      setIsImportResultOpen(
        skippedErrors.length > 0 || (result.emailErrors?.length ?? 0) > 0,
      );

      if (result.importedCount > 0) {
        setPaginationModel((current) => ({ ...current, page: 0 }));
        reload();
      }

      if (result.importedCount === 0) {
        setToast({
          severity: "error",
          message: `No students were imported. ${skippedCount} rows were skipped due to validation errors.`,
        });
      } else if (skippedCount > 0) {
        setToast({
          severity: "warning",
          message: `${result.importedCount} students imported successfully. ${skippedCount} rows were skipped due to validation errors.`,
        });
      } else {
        setToast({
          severity: "success",
          message: `${result.importedCount} students imported successfully.`,
        });
      }

      setPreviewRows(null);
    } catch (err) {
      setToast({
        severity: "error",
        message: err instanceof Error ? err.message : "Could not import the students.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  function closeStudentForm() {
    setIsCreateOpen(false);
    setEditingStudent(null);
  }

  return (
    <div className="students-page">
      <div className="students-page__header">
        <div>
          <p className="students-page__eyebrow">DIRECTORY</p>
          <h1 className="students-page__title">Students</h1>
          <p className="students-page__subtitle">
            Keep track of your student community.
          </p>
        </div>
        <div className="students-page__header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleExcelImport}
          />
          <button
            type="button"
            className="students-page__add-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? "Preparing..." : "Import Excel"}
          </button>
          <button
            className="students-page__add-button"
            onClick={() => setIsCreateOpen(true)}
          >
            <span aria-hidden="true">+</span> Add Student
          </button>
        </div>
      </div>

      <section
        className="students-page__directory"
        aria-label="Student directory"
      >
        <div className="students-page__toolbar">
          <div>
            <h2>All students</h2>
            <p>
              {total} {total === 1 ? "student" : "students"} in your directory
            </p>
          </div>
          <SearchBar
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPaginationModel((current) => ({ ...current, page: 0 }));
            }}
            placeholder="Search by name or email..."
          />
        </div>
        {error && (
          <p className="students-page__error" role="alert">
            {error}
          </p>
        )}
        <StudentsGrid
          rows={rows}
          loading={loading}
          onEdit={openEdit}
          onDelete={openDelete}
          paginationModel={paginationModel}
          rowCount={total}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={(model) => {
            setSortModel(model.slice(0, 1));
            setPaginationModel((current) => ({ ...current, page: 0 }));
          }}
        />
      </section>

      {previewRows !== null && (
        <Dialog
          title="Preview Excel import"
          description="Review the rows before importing. Invalid rows will be skipped."
          onClose={() => setPreviewRows(null)}
          disableClose={isImporting}
          backdropClassName="student-dialog__backdrop"
          dialogClassName="student-dialog student-dialog--preview"
        >
          <div className="students-page__preview-table-wrap">
            <table className="students-page__preview-table">
              <thead>
                <tr>
                  <th>Excel row</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status / reason</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>{row.name || "—"}</td>
                    <td>{row.email || "—"}</td>
                    <td className={row.valid ? "students-page__preview-valid" : "students-page__preview-invalid"}>
                      {row.valid ? "Valid" : `Invalid: ${row.reasons.join(", ")}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="student-dialog__actions">
            <button
              type="button"
              className="student-dialog__cancel"
              onClick={() => setPreviewRows(null)}
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="students-page__add-button"
              onClick={confirmImport}
              disabled={isImporting || previewRows.length === 0}
            >
              {isImporting ? "Importing..." : "Import Valid Rows"}
            </button>
          </div>
        </Dialog>
      )}

      {isImportResultOpen && (
        <Dialog
          title="Import results"
          description={`${importErrors.length} row(s) skipped. ${emailErrors.length} welcome email(s) could not be sent.`}
          onClose={() => setIsImportResultOpen(false)}
          backdropClassName="student-dialog__backdrop"
          dialogClassName="student-dialog student-dialog--import-results"
        >
          <div className="students-page__result-list">
            {importErrors.map((item, index) => (
              <div className="students-page__result-item" key={`skip-${item.row}-${index}`}>
                <strong>Excel row {item.row} skipped</strong>
                <span>{item.reason}</span>
              </div>
            ))}
            {emailErrors.map((item, index) => (
              <div className="students-page__result-item students-page__result-item--email" key={`email-${item.row}-${index}`}>
                <strong>Excel row {item.row} ({item.email})</strong>
                <span>{item.reason}</span>
              </div>
            ))}
          </div>
          <div className="student-dialog__actions">
            <button
              type="button"
              className="students-page__add-button"
              onClick={() => setIsImportResultOpen(false)}
            >
              Close
            </button>
          </div>
        </Dialog>
      )}

      {(isCreateOpen || editingStudent) && (
        <Dialog
          title={editingStudent ? "Edit student" : "Create student"}
          onClose={closeStudentForm}
          disableClose={isCreating}
          backdropClassName="student-dialog__backdrop"
          dialogClassName="student-dialog"
        >
          <form className="student-dialog__form" onSubmit={handleCreateStudent}>
            <label htmlFor="student-name">Name</label>
            <input
              id="student-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
            <label htmlFor="student-email">Email</label>
            <input
              id="student-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {createError && (
              <p className="students-page__error" role="alert">
                {createError}
              </p>
            )}
            <div className="student-dialog__actions">
              <button
                type="button"
                className="student-dialog__cancel"
                onClick={closeStudentForm}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="students-page__add-button"
                disabled={isCreating}
              >
                {isCreating
                  ? "Saving..."
                  : editingStudent
                    ? "Save changes"
                    : "Create student"}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {deletingStudent && (
        <Dialog
          title="Delete student?"
          description={
            <>
              Are you sure you want to delete{" "}
              <strong>{deletingStudent.name}</strong>? This action cannot be
              undone.
            </>
          }
          role="alertdialog"
          onClose={() => setDeletingStudent(null)}
          disableClose={isDeleting}
          backdropClassName="student-dialog__backdrop"
          dialogClassName="student-dialog"
        >
          {deleteError && (
            <p className="students-page__error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="student-dialog__actions">
            <button
              type="button"
              className="student-dialog__cancel"
              onClick={() => setDeletingStudent(null)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="student-dialog__delete"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete student"}
            </button>
          </div>
        </Dialog>
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
      >
        {toast ? (
          <Alert
            severity={toast.severity}
            onClose={() => setToast(null)}
            variant="filled"
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </div>
  );
}
