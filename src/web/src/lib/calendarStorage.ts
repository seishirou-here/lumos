import { clear, createStore, del, get, keys, set } from 'idb-keyval';
import type { CalendarEventItem } from '@shared/types';

/**
 * Local IndexedDB store for calendar events, ensuring offline-first
 * availability on mobile before syncing with the CalDAV Radicale daemon.
 */
const calendarStore = createStore('lumos', 'calendar-events');

/** Sample initial events for academic & personal schedule tracking. */
const DEFAULT_EVENTS: CalendarEventItem[] = [
  {
    id: 'sample-academic-1',
    title: 'Masa Perkuliahan Semester Aktif',
    start: new Date().toISOString().slice(0, 10),
    allDay: true,
    tags: ['kuliah'],
    description: 'Jadwal perkuliahan harian kampus Papa',
  },
  {
    id: 'sample-lumos-sync',
    title: 'Weekly Review & Lumos Quick-Dump Sync',
    start: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    allDay: true,
    tags: ['personal', 'lumos'],
    description: 'Review memo mingguan dan sinkronisasi agenda',
  },
];

/** List all stored calendar events. */
export async function listCalendarEvents(): Promise<CalendarEventItem[]> {
  const ids = await keys(calendarStore);
  if (ids.length === 0) {
    // Seed default sample events on first run
    await Promise.all(DEFAULT_EVENTS.map((event) => set(event.id, event, calendarStore)));
    return DEFAULT_EVENTS;
  }

  const stored = await Promise.all(ids.map((id) => get<CalendarEventItem>(id, calendarStore)));
  return stored.filter((e): e is CalendarEventItem => e !== undefined);
}

/** Save or update a single calendar event. */
export async function saveCalendarEvent(event: CalendarEventItem): Promise<void> {
  await set(event.id, event, calendarStore);
}

/** Delete an event by ID. */
export async function deleteCalendarEvent(id: string): Promise<void> {
  await del(id, calendarStore);
}

/** Reset calendar store (testing/debug). */
export async function clearCalendarEvents(): Promise<void> {
  await clear(calendarStore);
}
