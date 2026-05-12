export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
};

export const formatDateShort = (dateStr: string): string => {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(dateStr));
};

export const formatDateRange = (start: string, end: string): string => {
  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
};

export const getDaysBetween = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getStatusLabel = (
  status: "upcoming" | "ongoing" | "completed"
): string => {
  const labels = {
    upcoming: "Sắp đi",
    ongoing: "Đang đi",
    completed: "Đã đi",
  };
  return labels[status];
};

export const getStatusColor = (
  status: "upcoming" | "ongoing" | "completed"
): string => {
  const colors = {
    upcoming: "bg-primary-100 text-primary-800",
    ongoing: "bg-success-50 text-success-700",
    completed: "bg-slate-100 text-slate-600",
  };
  return colors[status];
};
