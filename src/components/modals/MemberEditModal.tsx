import React, { useState, useRef } from 'react';
import { Member } from '../../types';
import { Avatar } from '../common/Avatar';
import { compressAndCropImage } from '../../utils/imageCompressor';
import { X, Upload, Camera } from 'lucide-react';

interface MemberEditModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: Member) => void;
}

const EMOJI_OPTIONS = ['👨', '👩', '👶', '👦', '👧', '👴', '👵', '🏡', '🐱', '🐶', '☕', '🌸'];

export const MemberEditModal: React.FC<MemberEditModalProps> = ({
  member,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !member) return null;

  const [name, setName] = useState(member.name);
  const [relation, setRelation] = useState(member.relation);
  const [avatarType, setAvatarType] = useState<'emoji' | 'image'>(member.avatarType);
  const [avatarValue, setAvatarValue] = useState(member.avatarValue);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const base64 = await compressAndCropImage(file, 200, 0.85);
      setAvatarType('image');
      setAvatarValue(base64);
    } catch {
      alert('处理照片失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...member,
      name: name.trim(),
      relation: relation.trim() || '家人',
      avatarType,
      avatarValue,
    });
    onClose();
  };

  const previewMember: Member = {
    ...member,
    name,
    avatarType,
    avatarValue,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-stone-200/80">
        <div className="px-5 py-4 flex items-center justify-between border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-800">编辑成员</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {/* 头像预览与拍照上传 */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar member={previewMember} size="lg" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-stone-900 text-white rounded-full shadow-xs hover:bg-stone-700 transition"
                title="上传照片"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mt-2 text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              {isProcessing ? '处理照片中...' : '从手机/电脑上传生活照'}
            </button>
          </div>

          {/* 或者从常用 Emoji 选择 */}
          <div>
            <label className="block text-xs text-stone-400 mb-1.5 text-center">或选择卡通头像</label>
            <div className="flex flex-wrap justify-center gap-1.5">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setAvatarType('emoji');
                    setAvatarValue(emoji);
                  }}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition ${
                    avatarType === 'emoji' && avatarValue === emoji
                      ? 'border-stone-800 bg-stone-100'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 姓名与称谓 */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs text-stone-400 mb-1">成员姓名/称谓</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">家庭关系</label>
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 bg-stone-50"
              />
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-xs"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
