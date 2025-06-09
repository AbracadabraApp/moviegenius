import React from 'react';

export interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export interface PlatformPickerProps {
  platforms: Platform[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  columns?: number;
}

export const PlatformCard: React.FC<{
  platform: Platform;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ platform, isSelected, onToggle }) => (
  <div
    onClick={onToggle}
    className={`p-4 rounded-2xl shadow hover:shadow-md cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
      isSelected ? 'border-2 border-black' : 'border'
    }`}
  >
    <div className="text-3xl">{platform.icon}</div>
    <div className="text-sm font-medium text-center">{platform.name}</div>
  </div>
);

export const PlatformPicker: React.FC<PlatformPickerProps> = ({
  platforms,
  selected,
  onToggle,
  columns = 3,
}) => (
  <div className={`grid grid-cols-${columns} gap-4`}>
    {platforms.map((plat) => (
      <PlatformCard
        key={plat.id}
        platform={plat}
        isSelected={selected.has(plat.id)}
        onToggle={() => onToggle(plat.id)}
      />
    ))}
  </div>
);
