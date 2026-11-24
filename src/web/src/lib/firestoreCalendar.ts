import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';

import type { CalendarEventItem } from '@shared/types';

import { db } from './firebase';

const CALENDAR_COLLECTION = 'calendarEvents';

function requireDb() {
  if (!db) {
    throw new Error('Cloud Firestore belum dikonfigurasi.');
  }
  return db;
}

function toCalendarEvent(id: string, data: DocumentData): CalendarEventItem {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '(Tanpa Judul)',
    start: typeof data.start === 'string' ? data.start : new Date().toISOString().slice(0, 10),
    end: typeof data.end === 'string' ? data.end : undefined,
    allDay: data.allDay !== false,
    description: typeof data.description === 'string' ? data.description : undefined,
    location: typeof data.location === 'string' ? data.location : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === 'string')
      : undefined,
    color: typeof data.color === 'string' ? data.color : undefined,
  };
}

/** Real-time subscription to calendar events stored in Cloud Firestore. */
export function subscribeCalendarEvents(
  onData: (events: CalendarEventItem[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const firestore = requireDb();
  const eventsQuery = query(collection(firestore, CALENDAR_COLLECTION), orderBy('start', 'asc'));

  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      const events = snapshot.docs.map((docSnap) => toCalendarEvent(docSnap.id, docSnap.data()));
      onData(events);
    },
    (error) => {
      onError?.(error);
    },
  );
}

/** Save or update a calendar event in Firestore (works offline via persistent cache). */
export async function saveFirestoreCalendarEvent(event: CalendarEventItem): Promise<void> {
  const firestore = requireDb();
  const payload: Record<string, unknown> = {
    title: event.title,
    start: event.start,
    allDay: event.allDay ?? true,
  };

  if (event.end) payload.end = event.end;
  if (event.description) payload.description = event.description;
  if (event.location) payload.location = event.location;
  if (event.tags && event.tags.length > 0) payload.tags = event.tags;
  if (event.color) payload.color = event.color;

  await setDoc(doc(firestore, CALENDAR_COLLECTION, event.id), payload);
}

/** Delete a calendar event by ID in Firestore. */
export async function deleteFirestoreCalendarEvent(id: string): Promise<void> {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, CALENDAR_COLLECTION, id));
}
