import { useCallback, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import listPlugin from '@fullcalendar/react/list';
import interactionPlugin from '@fullcalendar/react/interaction';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import type { CalendarEventItem } from '@shared/types';
import { cn, haptic } from '../lib/utils';
import { deleteCalendarEvent, listCalendarEvents, saveCalendarEvent } from '../lib/calendarStorage';

type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'listWeek';

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  kuliah: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
  },
  event: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    border: 'border-sky-500/30',
  },
  personal: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-500/30',
  },
};

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [viewType, setViewType] = useState<CalendarViewType>('dayGridMonth');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);

  // Form states for new event
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTag, setNewTag] = useState('kuliah');
  const [newDesc, setNewDesc] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarRef = useRef<any>(null);

  const loadEvents = useCallback(async () => {
    try {
      const stored = await listCalendarEvents();
      setEvents(stored);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const updateTitle = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      setCalendarTitle(calendarApi.view.title);
    }
  }, []);

  useEffect(() => {
    // Initial title update
    const timer = setTimeout(updateTitle, 100);
    return () => clearTimeout(timer);
  }, [updateTitle, viewType]);

  const handlePrev = () => {
    haptic();
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.prev();
    updateTitle();
  };

  const handleNext = () => {
    haptic();
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.next();
    updateTitle();
  };

  const handleToday = () => {
    haptic();
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.today();
    updateTitle();
  };

  const handleChangeView = (newView: CalendarViewType) => {
    haptic();
    setViewType(newView);
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.changeView(newView);
    updateTitle();
  };

  const handleDateClick = (arg: { dateStr: string }) => {
    haptic();
    setNewDate(arg.dateStr);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSaveNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    haptic();
    const newEvent: CalendarEventItem = {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: newTitle.trim(),
      start: newDate,
      allDay: true,
      tags: [newTag],
      description: newDesc.trim() || undefined,
    };

    await saveCalendarEvent(newEvent);
    await loadEvents();

    setIsModalOpen(false);
    setNewTitle('');
    setNewDate('');
    setNewDesc('');
  };

  const handleDeleteEvent = async (id: string) => {
    haptic();
    await deleteCalendarEvent(id);
    await loadEvents();
    setSelectedEvent(null);
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'all') return true;
    return e.tags?.includes(activeFilter);
  });

  // Convert to FullCalendar format
  const fcEvents = filteredEvents.map((e) => {
    const tag = e.tags?.[0] ?? 'kuliah';
    const tagStyle = TAG_COLORS[tag] ?? TAG_COLORS.kuliah;
    return {
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay ?? true,
      extendedProps: {
        description: e.description,
        tags: e.tags,
      },
      className: `fc-event-custom ${tagStyle.bg} ${tagStyle.text} ${tagStyle.border}`,
    };
  });

  return (
    <section className="mt-2 flex flex-col gap-4 pb-24 animate-fade-in">
      {/* Calendar Action & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-lumos-line/60 bg-lumos-surface/70 p-3.5 backdrop-blur-xl shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Month / Period Title & Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Period"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-lumos-line bg-lumos-surface text-zinc-300 transition-colors hover:border-lumos-accent/40 hover:bg-lumos-elevated hover:text-zinc-100 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="h-8 rounded-lg border border-lumos-line bg-lumos-surface px-2.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-lumos-accent/40 hover:bg-lumos-elevated hover:text-zinc-100 active:scale-95"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Period"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-lumos-line bg-lumos-surface text-zinc-300 transition-colors hover:border-lumos-accent/40 hover:bg-lumos-elevated hover:text-zinc-100 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <span className="ml-1 text-sm font-semibold tracking-wide text-zinc-100">
              {calendarTitle}
            </span>
          </div>

          {/* View Switcher & Add Button */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-lumos-line bg-lumos-surface p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleChangeView('dayGridMonth')}
                className={cn(
                  'rounded-md px-2 py-1 font-medium transition-colors',
                  viewType === 'dayGridMonth'
                    ? 'bg-lumos-accent/20 text-lumos-accent shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                Bulan
              </button>
              <button
                type="button"
                onClick={() => handleChangeView('timeGridWeek')}
                className={cn(
                  'rounded-md px-2 py-1 font-medium transition-colors',
                  viewType === 'timeGridWeek'
                    ? 'bg-lumos-accent/20 text-lumos-accent shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                Minggu
              </button>
              <button
                type="button"
                onClick={() => handleChangeView('listWeek')}
                className={cn(
                  'rounded-md px-2 py-1 font-medium transition-colors',
                  viewType === 'listWeek'
                    ? 'bg-lumos-accent/20 text-lumos-accent shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                Agenda
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                haptic();
                setNewDate(new Date().toISOString().slice(0, 10));
                setSelectedEvent(null);
                setIsModalOpen(true);
              }}
              className="flex h-8 items-center gap-1 rounded-lg border border-lumos-accent/40 bg-lumos-accent/15 px-2.5 text-[11px] font-medium text-lumos-accent transition-colors hover:bg-lumos-accent/25 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Event</span>
            </button>
          </div>
        </div>

        {/* Category Tag Filters */}
        <div className="flex items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Filter:</span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'kuliah', label: '#kuliah' },
            { id: 'event', label: '#event' },
            { id: 'personal', label: '#personal' },
          ].map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                haptic();
                setActiveFilter(tag.id);
              }}
              className={cn(
                'rounded-md px-2 py-0.5 transition-colors',
                activeFilter === tag.id
                  ? 'border border-lumos-accent/40 bg-lumos-accent/15 font-medium text-lumos-accent'
                  : 'text-zinc-400 hover:bg-lumos-elevated hover:text-zinc-200',
              )}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main FullCalendar Canvas */}
      <div className="lumos-calendar-wrap rounded-2xl border border-lumos-line/60 bg-lumos-surface/80 p-3 backdrop-blur-xl shadow-panel">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={viewType}
          headerToolbar={false}
          events={fcEvents}
          dateClick={handleDateClick}
          eventClick={(info) => {
            haptic();
            const found = events.find((e) => e.id === info.event.id);
            if (found) setSelectedEvent(found);
          }}
          height="auto"
          editable={false}
          dayMaxEvents={2}
          eventDisplay="block"
        />
      </div>

      {/* Modal: View Selected Event Details */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-2xl border border-lumos-line bg-lumos-surface p-5 shadow-panel-raised animate-scale-in">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lumos-accent bg-lumos-accent/15 border border-lumos-accent/20">
                  #{selectedEvent.tags?.[0] ?? 'agenda'}
                </span>
                <h3 className="mt-2 text-base font-semibold text-zinc-100">{selectedEvent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-lumos-elevated hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
              <p>
                <strong className="text-zinc-300">Tanggal:</strong> {selectedEvent.start}
              </p>
              {selectedEvent.description && (
                <p className="mt-2 rounded-lg bg-lumos-elevated/60 p-2.5 text-zinc-300">
                  {selectedEvent.description}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Event</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Event */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
        >
          <form
            onSubmit={handleSaveNewEvent}
            className="w-full max-w-sm rounded-2xl border border-lumos-line bg-lumos-surface p-5 shadow-panel-raised animate-scale-in"
          >
            <div className="flex items-center justify-between border-b border-lumos-line/60 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <CalendarIcon className="h-4 w-4 text-lumos-accent" />
                <span>Tambah Jadwal Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-lumos-elevated hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400">Judul Kegiatan</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Kuliah Pemrograman Web, UAS..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-lumos-line bg-lumos-elevated/70 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-lumos-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400">Tanggal</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-lumos-line bg-lumos-elevated/70 px-3 py-2 text-xs text-zinc-100 focus:border-lumos-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400">Kategori Tag</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-lumos-line bg-lumos-elevated/70 px-3 py-2 text-xs text-zinc-100 focus:border-lumos-accent focus:outline-none"
                >
                  <option value="kuliah">#kuliah (Akademik)</option>
                  <option value="event">#event (Kegiatan / Webinar)</option>
                  <option value="personal">#personal (Pribadi / Tugas)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400">
                  Deskripsi / Catatan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan agenda..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-lumos-line bg-lumos-elevated/70 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-lumos-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-lumos-line px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-lumos-elevated"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg border border-lumos-accent/40 bg-lumos-accent px-4 py-1.5 text-xs font-semibold text-lumos-accent-ink transition-colors hover:bg-lumos-accent-soft active:scale-95"
              >
                Simpan Jadwal
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
