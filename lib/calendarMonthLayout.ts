/**
 * Diseño del calendario mensual
 * Layout de barras multi-día y marcadores de eventos para la vista grupal.
 */

import { CalendarEventWithDetails } from "@/types/database";

export const CALENDAR_EVENT_MARKER_SIZE = 4;
export const CALENDAR_EVENT_MARKER_GAP = 2;
export const CALENDAR_MAX_BAR_LANES = 3;

export interface CalendarWeekBar {
  eventId: string;
  color: string;
  rowIdx: number;
  startCol: number;
  endCol: number;
  lane: number;
  roundLeft: boolean;
  roundRight: boolean;
}

export interface CalendarMonthLayout {
  singleDayDots: Map<number, string[]>;
  weekBarsByRow: Map<number, CalendarWeekBar[]>;
  maxLanesByRow: Map<number, number>;
}

type EventSlice = Pick<
  CalendarEventWithDetails,
  "id" | "color" | "starts_at" | "ends_at"
>;

function toLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function getMondayBasedOffset(year: number, month: number): number {
  let first = new Date(year, month, 1).getDay() - 1;
  if (first < 0) first = 6;
  return first;
}

function dayToPosition(
  day: number,
  startOffset: number,
): { rowIdx: number; col: number } {
  const index = startOffset + day - 1;
  return { rowIdx: Math.floor(index / 7), col: index % 7 };
}


export function buildCalendarMonthLayout(
  events: EventSlice[],
  year: number,
  month: number,
): CalendarMonthLayout {
  const startOffset = getMondayBasedOffset(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, daysInMonth);

  const singleDayDots = new Map<number, string[]>();
  const rawBars: Omit<CalendarWeekBar, "lane">[] = [];

  for (const event of events) {
    const eventStart = toLocalDay(new Date(event.starts_at));
    let eventEnd = event.ends_at
      ? toLocalDay(new Date(event.ends_at))
      : eventStart;
    if (eventEnd < eventStart) eventEnd = eventStart;

    if (eventStart > monthEnd || eventEnd < monthStart) continue;

    const clipStart = eventStart < monthStart ? monthStart : eventStart;
    const clipEnd = eventEnd > monthEnd ? monthEnd : eventEnd;

    if (clipStart.getTime() === clipEnd.getTime()) {
      const day = clipStart.getDate();
      const dots = singleDayDots.get(day) || [];
      if (dots.length < 4) dots.push(event.color);
      singleDayDots.set(day, dots);
      continue;
    }

    let cursor = clipStart;
    while (cursor <= clipEnd) {
      const { rowIdx, col: startCol } = dayToPosition(
        cursor.getDate(),
        startOffset,
      );

      let endCol = startCol;
      let segmentLast = cursor;
      let probe = cursor;

      while (probe <= clipEnd) {
        const pos = dayToPosition(probe.getDate(), startOffset);
        if (pos.rowIdx !== rowIdx) break;
        endCol = pos.col;
        segmentLast = probe;
        if (probe.getTime() === clipEnd.getTime()) break;
        probe = addDays(probe, 1);
      }

      rawBars.push({
        eventId: event.id,
        color: event.color,
        rowIdx,
        startCol,
        endCol,
        roundLeft: cursor.getTime() === clipStart.getTime(),
        roundRight: segmentLast.getTime() === clipEnd.getTime(),
      });

      cursor = addDays(segmentLast, 1);
    }
  }

  const weekBarsByRow = new Map<number, CalendarWeekBar[]>();
  const maxLanesByRow = new Map<number, number>();
  const byRow = new Map<number, Omit<CalendarWeekBar, "lane">[]>();

  for (const bar of rawBars) {
    const list = byRow.get(bar.rowIdx) || [];
    list.push(bar);
    byRow.set(bar.rowIdx, list);
  }

  const preferredLaneByEvent = new Map<string, number>();

  for (const [rowIdx, bars] of byRow) {
    const sorted = [...bars].sort((a, b) =>
      a.startCol !== b.startCol ? a.startCol - b.startCol : a.endCol - b.endCol,
    );
    const laneEnds: number[] = [];
    const placed: CalendarWeekBar[] = [];

    const pickLane = (bar: Omit<CalendarWeekBar, "lane">): number | null => {
      const preferred = preferredLaneByEvent.get(bar.eventId);
      if (
        preferred !== undefined &&
        preferred < CALENDAR_MAX_BAR_LANES &&
        (laneEnds[preferred] === undefined || laneEnds[preferred] < bar.startCol)
      ) {
        return preferred;
      }
      for (let lane = 0; lane < CALENDAR_MAX_BAR_LANES; lane++) {
        if (laneEnds[lane] === undefined || laneEnds[lane] < bar.startCol) {
          return lane;
        }
      }
      return null;
    };

    for (const bar of sorted) {
      const lane = pickLane(bar);
      if (lane === null) continue;

      laneEnds[lane] = bar.endCol;
      preferredLaneByEvent.set(bar.eventId, lane);
      placed.push({ ...bar, lane });
    }

    weekBarsByRow.set(rowIdx, placed);
    maxLanesByRow.set(
      rowIdx,
      placed.reduce((max, b) => Math.max(max, b.lane + 1), 0),
    );
  }

  return { singleDayDots, weekBarsByRow, maxLanesByRow };
}

export function eventOverlapsLocalDay(
  event: Pick<CalendarEventWithDetails, "starts_at" | "ends_at">,
  date: Date,
): boolean {
  const dayStart = toLocalDay(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const evStart = new Date(event.starts_at);
  const evEnd = event.ends_at ? new Date(event.ends_at) : evStart;
  return evStart <= dayEnd && toLocalDay(evEnd) >= dayStart;
}
