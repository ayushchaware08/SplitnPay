import React from 'react';

interface MemberAvatarProps {
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<MemberAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  name,
  color,
  size = 'md',
  className = '',
}) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 select-none ${SIZE_CLASSES[size]} ${className}`}
      style={{ backgroundColor: color }}
      title={name}
      aria-label={name}
    >
      {initials}
    </span>
  );
};
