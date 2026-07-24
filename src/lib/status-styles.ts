// Single source of truth for appointment-status chip styling. This palette
// was previously copy-pasted (with drift — admin used -100/-700 shades while
// everywhere else used -50/-600) across five pages, and none of the copies
// had dark-mode variants, so every chip rendered as a glaring light pill on
// the dark theme. Keys cover every appointment status in the system.
export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
  CONFIRMED: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/50',
  CANCELLED: 'bg-red-50 text-red-500 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50',
  COMPLETED: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
  NO_SHOW: 'bg-muted text-muted-foreground border-border',
}

// Deposit tracking chips (nailist appointments page) — same treatment.
export const DEPOSIT_STATUS_COLORS: Record<string, string> = {
  AWAITING_PAYMENT: APPOINTMENT_STATUS_COLORS.PENDING,
  CLIENT_MARKED_PAID: APPOINTMENT_STATUS_COLORS.COMPLETED,
  NAILIST_CONFIRMED: APPOINTMENT_STATUS_COLORS.CONFIRMED,
}
