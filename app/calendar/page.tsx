'use client';

import { useState, useEffect } from 'react';
import { supabase, Reservation } from '@/lib/supabaseClient';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info } from 'lucide-react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // July 2026 default
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  async function fetchReservations() {
    setLoading(true);
    const { data } = await supabase
      .from('reservations')
      .select('*, customers(*), platforms(*)')
      .eq('canceled', false);

    setReservations(data || []);
    setLoading(false);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0

  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ];

  const daysOfWeek = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function getReservationsForDay(dayNumber: number) {
    const dayDate = new Date(year, month, dayNumber);
    return reservations.filter(res => {
      const start = new Date(res.start_date);
      const end = new Date(res.end_date);
      return dayDate >= start && dayDate <= end;
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-sky-400" />
            <span>Ημερολόγιο Κρατήσεων</span>
          </h1>
          <p className="text-sm text-slate-400">Προβολή διαθεσιμότητας και πληρότητας βίλας</p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold text-white px-4 min-w-[160px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {daysOfWeek.map((day, i) => (
            <div key={day} className={`text-xs font-bold uppercase py-2 ${i >= 5 ? 'text-indigo-400' : 'text-slate-400'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Blank padding cells before day 1 */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`blank-${i}`} className="h-24 bg-slate-950/20 rounded-xl border border-transparent"></div>
          ))}

          {/* Actual Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayRes = getReservationsForDay(dayNum);
            const isBooked = dayRes.length > 0;

            return (
              <div
                key={`day-${dayNum}`}
                className={`h-24 p-2 rounded-xl border transition-all flex flex-col justify-between ${
                  isBooked
                    ? 'bg-gradient-to-br from-sky-950/40 to-indigo-950/40 border-sky-500/40 shadow-sm shadow-sky-500/10'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isBooked ? 'text-sky-300' : 'text-slate-400'}`}>
                    {dayNum}
                  </span>
                  {isBooked && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                  )}
                </div>

                {/* Reservation Badge */}
                {isBooked ? (
                  <div className="space-y-1">
                    {dayRes.map(r => (
                      <div
                        key={r.reser_id}
                        className="bg-sky-500/20 border border-sky-500/30 text-sky-200 text-[10px] p-1 rounded-lg truncate font-medium"
                        title={`${r.customers?.name} (${r.platforms?.name})`}
                      >
                        {r.customers?.name || 'Κράτηση'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-500/60 font-medium">Ελεύθερο</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
