import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { AffairItem, Member } from '../../types';

interface CalendarViewProps {
  affairs: AffairItem[];
  members: Member[];
  onSelectDate: (dateStr: string) => void;
  onSelectEvent: (item: AffairItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  affairs,
  members,
  onSelectDate,
  onSelectEvent,
}) => {
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const events = useMemo(() => {
    return affairs.map((item) => {
      const member = memberMap.get(item.memberId);
      return {
        id: item.id,
        title: `${member?.name ? member.name + ' · ' : ''}${item.title}`,
        start: item.date,
        allDay: true,
        backgroundColor: item.done ? '#a8a29e' : (member?.color || '#292524'),
        borderColor: item.done ? '#a8a29e' : (member?.color || '#292524'),
        textColor: '#ffffff',
        extendedProps: { raw: item },
      };
    });
  }, [affairs, memberMap]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* 提示 */}
      <div className="flex items-center justify-between text-xs text-stone-400 px-1">
        <span>点击日历空白日期即可添加待办，点击事项可查看详情</span>
        <div className="flex items-center gap-3">
          {members.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center gap-1">
              <span style={{ backgroundColor: m.color }} className="w-2 h-2 rounded-full inline-block"></span>
              <span>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 日历卡片 */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200/80 shadow-xs">
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
            list: '列表',
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
