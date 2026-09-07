import React from 'react';
import { Member } from '../../types';

interface AvatarProps {
  member?: Member;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  member,
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  if (!member) {
    return (
      <div className={`${sizeMap[size]} rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-medium shrink-0 ${className}`}>
        家
      </div>
    );
  }

  if (member.avatarType === 'image' && member.avatarValue) {
    return (
      <img
        src={member.avatarValue}
        alt={member.name}
        className={`${sizeMap[size]} rounded-full object-cover shrink-0 border border-stone-200/80 shadow-2xs ${className}`}
      />
    );
  }

  return (
    <div
      style={{
        backgroundColor: `${member.color}15`,
        borderColor: `${member.color}30`,
      }}
      className={`${sizeMap[size]} rounded-full flex items-center justify-center select-none shrink-0 border shadow-2xs ${className}`}
    >
      <span>{member.avatarValue || member.name[0]}</span>
    </div>
  );
};
