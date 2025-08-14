import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => (
  <div className="relative w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className}`}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => (
  <thead className={`[&_tr]:border-b ${className}`}>
    {children}
  </thead>
);

export const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`}>
    {children}
  </tbody>
);

export const TableRow: React.FC<TableRowProps> = ({ children, className = '' }) => (
  <tr className={`border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50 ${className}`}>
    {children}
  </tr>
);

export const TableHead: React.FC<TableHeadProps> = ({ children, className = '' }) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0 ${className}`}>
    {children}
  </th>
);

export const TableCell: React.FC<TableCellProps> = ({ children, className = '' }) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>
    {children}
  </td>
);
