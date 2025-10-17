'use client';

import React from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { MarketStatus } from '@/types/market';

interface MarketFiltersProps {
  statusFilter: MarketStatus | 'all';
  onStatusChange: (status: MarketStatus | 'all') => void;
  sortBy: 'newest' | 'volume' | 'participants';
  onSortChange: (sort: 'newest' | 'volume' | 'participants') => void;
}

export const MarketFilters: React.FC<MarketFiltersProps> = ({
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
}) => {
  const statusOptions: { value: MarketStatus | 'all'; label: string; color?: string }[] = [
    { value: 'all', label: 'All Markets' },
    { value: 'active', label: 'Active', color: 'text-success-400' },
    { value: 'pending_resolution', label: 'Pending Resolution', color: 'text-warning-400' },
    { value: 'resolved', label: 'Resolved', color: 'text-info-400' },
    { value: 'disputed', label: 'Disputed', color: 'text-error-400' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-muted-foreground' },
  ];

  const sortOptions: { value: 'newest' | 'volume' | 'participants'; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'volume', label: 'Highest Volume' },
    { value: 'participants', label: 'Most Participants' },
  ];

  return (
    <div className="flex items-center space-x-4">
      {/* Status Filter */}
      <div className="relative">
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as MarketStatus | 'all')}
          className="appearance-none bg-background border border-border rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Sort Filter */}
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'newest' | 'volume' | 'participants')}
          className="appearance-none bg-background border border-border rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Filter Icon */}
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span className="text-sm">Filters</span>
      </div>
    </div>
  );
};