import React from 'react';

export const StatusBadge: React.FC<{ done: boolean }> = ({ done }) => {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${done ? 'bg-stone-100 text-stone-400' : 'bg-amber-50 text-amber-800'}`}>
      {done ? '已办' : '待办'}
    </span>
  );
};
