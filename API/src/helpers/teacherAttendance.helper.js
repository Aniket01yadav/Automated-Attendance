export const SCHOOL_START_HOUR = 9;
export const SCHOOL_START_MINUTE = 0;
export const HALF_DAY_MIN_HOURS = 4;

export const normalizeDayStart = (inputDate = new Date()) => {
  const d = new Date(inputDate);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const normalizeDayEnd = (inputDate = new Date()) => {
  const d = new Date(inputDate);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const createSchoolStartTime = (inputDate = new Date()) => {
  const d = normalizeDayStart(inputDate);
  d.setHours(SCHOOL_START_HOUR, SCHOOL_START_MINUTE, 0, 0);
  return d;
};

export const roundToTwo = (n) => Math.round(n * 100) / 100;

export const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (ms <= 0) return 0;

  return roundToTwo(ms / (1000 * 60 * 60));
};

export const getMonthRange = (year, month) => {
  const y = Number(year);
  const m = Number(month);

  const start = new Date(y, m - 1, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(y, m, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const eachDayInRange = (fromDate, toDate) => {
  const days = [];
  const current = normalizeDayStart(fromDate);
  const end = normalizeDayStart(toDate);

  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
};

export const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
