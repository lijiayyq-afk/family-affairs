import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { TodoItem } from '../../types';
import { MEMBER_COLORS } from '../../constants/initialData';

interface CalendarViewProps {
  todos: TodoItem[];
  onSelectDate: (dateStr: string) => void;
  onSelectEvent: (item: TodoItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  todos,
  onSelectDate,
  onSelectEvent,
}) => {
  const events = useMemo(() => {
    return todos.map((item) => {
      const color = MEMBER_COLORS[item.member] || { bg: '#27272a', text: '#fff' };
      return {
        id: item.id,
        title: `${item.member} · ${item.title}`,
        start: item.date,
        allDay: true,
        backgroundColor: item.done ? '#d4d4d8' : color.bg,
        borderColor: item.done ? '#d4d4d8' : '#e4e4e7',
        textColor: item.done ? '#71717a' : color.text,
        extendedProps: { raw: item },
      };
    });
  }, [todos]);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="text-xs text-zinc-400 px-1">
        点击日历日期可快速记事，点击事项可修改或删除
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs">
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth',
          }}
          locale="zh-cn"
          buttonText={{
            today: '今天',
            month: '月历',
            list: '清单',
          }}
          events={events}
          dateClick={(info: any) => onSelectDate(info.dateStr)}
          eventClick={(info: any) => onSelectEvent(info.event.extendedProps.raw)}
          height="auto"
          dayMaxEvents={3}
          firstDay={1}
        />
      </div>
    </div>
  );
};
