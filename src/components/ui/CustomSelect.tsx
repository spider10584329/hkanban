'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  clearable?: boolean;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Choose an option',
  className = '',
  searchable = true,
  clearable = true,
  required = false,
  disabled = false,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState<DropdownPos>({ top: 0, left: 0, width: 0, openUpward: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = searchQuery.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleOpen = () => {
    if (disabled) return;
    // Calculate position relative to viewport for fixed positioning
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = Math.min(options.length * 36 + (searchable ? 52 : 0) + (clearable ? 40 : 0) + 8, 280);
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      setDropdownPos({
        top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUpward,
      });
    }
    setIsOpen(true);
    setSearchQuery('');
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    handleClose();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    handleClose();
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  // Close on scroll or resize to avoid stale position
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => handleClose();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, handleClose]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      id={id}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={isOpen ? handleClose : handleOpen}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2
          px-3 py-2 text-sm
          bg-white border rounded-lg
          transition-all duration-150
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-gray-400'}
          ${isOpen
            ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
            : 'border-gray-300'
          }
        `}
      >
        <span className={`truncate text-left ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {/* Chevron */}
        <svg
          className={`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown — rendered fixed to escape any overflow:hidden parent */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
        >
          {/* Search */}
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  onKeyDown={(e) => e.key === 'Escape' && handleClose()}
                />
              </div>
            </div>
          )}

          {/* Clear Selection */}
          {clearable && (
            <div className="border-b border-gray-100">
              <button
                type="button"
                onClick={handleClear}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="font-medium">Clear Selection</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Options List */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">No options found</li>
            ) : (
              filteredOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`
                      w-full text-left px-3 py-2 text-sm transition-colors
                      ${option.value === value
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
