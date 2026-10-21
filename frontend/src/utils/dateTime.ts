const NIGERIA_TIME_ZONE = 'Africa/Lagos';

export const getNigeriaDateInputValue = (value = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: NIGERIA_TIME_ZONE,
  }).format(value);

const parseDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  // The report's task date is a calendar date, not a UTC timestamp.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00+01:00`);
  }
  return new Date(value);
};

export const isBeforeReportEditDeadline = (publishedDate?: string | Date | null, now = new Date()): boolean => {
  if (!publishedDate) return false;
  const date = parseDate(publishedDate);
  if (Number.isNaN(date.getTime())) return false;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NIGERIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const deadline = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + 1, 9);
  return now.getTime() <= deadline;
};

export const formatNigeriaDate = (value?: string | Date | null): string => {
  if (!value) return 'N/A';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: NIGERIA_TIME_ZONE,
  }).format(date);
};

export const formatNigeriaDateTime = (value?: string | Date | null): string => {
  if (!value) return 'N/A';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: NIGERIA_TIME_ZONE,
  }).format(date);
  return `${formatted} WAT`;
};
