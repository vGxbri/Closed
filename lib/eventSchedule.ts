import { CalendarEvent } from "@/types/database";

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export type EventScheduleInput = Pick<
  CalendarEvent,
  "starts_at" | "ends_at" | "is_all_day"
>;

export interface EventScheduleDisplay {
  dateLabel: string;
  timeLabel: string;
  isMultiDay: boolean;
}

function toLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatSingleDate(d: Date): string {
  const day = toLocalDay(d);
  return `${DAYS_ES[day.getDay()]} ${day.getDate()} de ${MONTHS_ES[day.getMonth()]} de ${day.getFullYear()}`;
}

function formatDateRange(start: Date, end: Date): string {
  const startDay = toLocalDay(start);
  const endDay = toLocalDay(end);
  const sameYear = startDay.getFullYear() === endDay.getFullYear();
  const sameMonth =
    sameYear && startDay.getMonth() === endDay.getMonth();

  if (sameMonth) {
    return `Del ${DAYS_ES[startDay.getDay()]} ${startDay.getDate()} al ${DAYS_ES[endDay.getDay()]} ${endDay.getDate()} de ${MONTHS_ES[startDay.getMonth()]} de ${startDay.getFullYear()}`;
  }
  if (sameYear) {
    return `Del ${startDay.getDate()} de ${MONTHS_ES[startDay.getMonth()]} al ${endDay.getDate()} de ${MONTHS_ES[endDay.getMonth()]} de ${startDay.getFullYear()}`;
  }
  return `Del ${formatSingleDate(startDay)} al ${formatSingleDate(endDay)}`;
}

export function getEventDaySpan(
  event: EventScheduleInput,
): { start: Date; end: Date; isMultiDay: boolean; dayCount: number } {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : start;
  const startDay = toLocalDay(start);
  const endDay = toLocalDay(end);
  const isMultiDay = endDay.getTime() > startDay.getTime();
  const dayCount = isMultiDay
    ? Math.round((endDay.getTime() - startDay.getTime()) / 86400000) + 1
    : 1;

  return { start, end, isMultiDay, dayCount };
}

/** Labels for event detail, list cards, widgets, etc. */
export function getEventScheduleDisplay(
  event: EventScheduleInput,
): EventScheduleDisplay {
  const { start, end, isMultiDay, dayCount } = getEventDaySpan(event);

  if (event.is_all_day) {
    return {
      dateLabel: isMultiDay ? formatDateRange(start, end) : formatSingleDate(start),
      timeLabel: isMultiDay
        ? `Todo el día · ${dayCount} días`
        : "Todo el día",
      isMultiDay,
    };
  }

  if (isMultiDay) {
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    return {
      dateLabel: formatDateRange(start, end),
      timeLabel: `${startTime} → ${endTime} · ${dayCount} días`,
      isMultiDay,
    };
  }

  const startTime = formatTime(start);
  let timeLabel = startTime;
  if (event.ends_at) {
    const endTime = formatTime(end);
    if (endTime !== startTime) {
      timeLabel = `${startTime} - ${endTime}`;
    }
  }

  return {
    dateLabel: formatSingleDate(start),
    timeLabel,
    isMultiDay: false,
  };
}

/** Compact line for calendar list cards */
export function getEventScheduleCompact(event: EventScheduleInput): string {
  const display = getEventScheduleDisplay(event);
  if (display.isMultiDay) {
    return display.timeLabel;
  }
  return display.timeLabel;
}
