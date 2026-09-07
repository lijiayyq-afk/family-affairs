import React from 'react';
import { Member, AffairItem } from '../../types';
import { Avatar } from '../common/Avatar';
import { Plus, Camera } from 'lucide-react';

interface MemberViewProps {
  members: Member[];
  affairs: AffairItem[];
  onEditMember: (member: Member) => void;
  onAddForMember: (memberId: string) => void;
  onFilterMember: (memberId: string) => void;
}

export const MemberView: React.FC<MemberViewProps> = ({
  members,
  affairs,
  onEditMember,
  onAddForMember,
  onFilterMember,
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="text-xs text-stone-400 px-1">
        点击头像可更换生活照或称谓，点击卡片可查看其名下待办
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {members.map((member) => {
          const memberItems = affairs.filter((a) => a.memberId === member.id && !a.done);

          return (
            <div
              key={member.id}
              className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div
                  onClick={() => onFilterMember(member.id)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div className="relative group">
                    <Avatar member={member} size="lg" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMember(member);
                      }}
                      className="absolute -bottom-1 -right-1 p-1 bg-white border border-stone-200 rounded-full shadow-xs text-stone-500 hover:text-stone-900 transition"
                      title="更换头像"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <div className="font-semibold text-stone-800 text-sm">{member.name}</div>
                    <div className="text-xs text-stone-400 mt-0.5">{member.relation}</div>
                  </div>
                </div>

                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                  {memberItems.length} 待办
                </span>
              </div>

              {/* 快速记一笔 */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onFilterMember(member.id)}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  查看事务 →
                </button>
                <button
                  type="button"
                  onClick={() => onAddForMember(member.id)}
                  className="flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900 px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200/60 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>记一笔</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
