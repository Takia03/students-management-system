'use client';

import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import type { Student } from '@/types/student';

interface StudentsGridProps {
  rows: Student[];
  loading: boolean;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  paginationModel: GridPaginationModel;
  rowCount: number;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  sortModel: GridSortModel;
  onSortModelChange: (model: GridSortModel) => void;
}

function RowActions({ student, onEdit, onDelete }: {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton aria-label={`Actions for ${student.name}`} onClick={(event) => setAnchor(event.currentTarget)} size="small">
        <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1,paddingLeft: 8 }}>⋮</span>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onEdit(student); }}>Edit</MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onDelete(student); }}>Delete</MenuItem>
      </Menu>
    </>
  );
}

export default function StudentsGrid({ rows, loading, onEdit, onDelete, paginationModel, rowCount, onPaginationModelChange, sortModel, onSortModelChange }: StudentsGridProps) {
  const columns: GridColDef<Student>[] = [
    { field: 'id', headerName: 'ID', width: 76, minWidth: 76, },
    { field: 'name', headerName: 'Name', width: 280, minWidth: 150 },
    { field: 'email', headerName: 'Email', width: 400, minWidth: 220 },
    { field: 'created_at', headerName: 'Created', width: 190, minWidth: 190 },
    {
      field: 'actions', headerName: '', width: 56, minWidth: 56, sortable: false, filterable: false,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => <RowActions student={params.row} onEdit={onEdit} onDelete={onDelete} />,
    },
  ];
  return (
    <div className="students-grid-wrap">
      <div className="students-grid">
        <DataGrid
          className="students-grid__table"
          rows={rows}
          columns={columns}
          loading={loading}
          paginationMode="server"
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={onSortModelChange}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          rowCount={rowCount}
          pageSizeOptions={[10, 25, 50]}
          disableColumnMenu
          disableColumnFilter
          disableColumnSelector
          disableRowSelectionOnClick
        />
      </div>
    </div>
  );
}
