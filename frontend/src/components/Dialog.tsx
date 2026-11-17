'use client';

import { useEffect, useId, type MouseEvent, type ReactNode } from 'react';

interface DialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  description?: ReactNode;
  role?: 'dialog' | 'alertdialog';
  disableClose?: boolean;
  backdropClassName: string;
  dialogClassName: string;
}

export default function Dialog({
  title,
  children,
  onClose,
  description,
  role = 'dialog',
  disableClose = false,
  backdropClassName,
  dialogClassName,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !disableClose) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disableClose, onClose]);

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !disableClose) onClose();
  }

  return (
    <div
      className={backdropClassName}
      onMouseDown={handleBackdropMouseDown}
    >
      <section
        className={dialogClassName}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
        {children}
      </section>
    </div>
  );
}
