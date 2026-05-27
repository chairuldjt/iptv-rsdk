'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface ActionItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface ActionMenuProps {
  items: ActionItem[]
  position?: 'bottom-end' | 'bottom-start'
}

export default function ActionMenu({ items, position = 'bottom-end' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        className="action-menu-trigger"
        onClick={() => setOpen(!open)}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className={`action-menu-dropdown ${position === 'bottom-start' ? 'left-0 right-auto' : 'right-0 left-auto'}`}>
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`action-menu-item ${item.danger ? 'action-menu-item-danger' : ''}`}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
