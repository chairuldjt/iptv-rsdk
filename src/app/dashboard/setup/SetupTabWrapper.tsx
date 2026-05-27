'use client'

import React, { useState } from 'react'
import ConfirmForm from '@/components/ConfirmForm'

interface TabWrapperProps {
  showSaved: boolean
  showReset: boolean
  showRelaySaved: boolean
  showRelayReset: boolean
  defaultSection: React.ReactNode
  runtimeSection: React.ReactNode
  resetDefaultSetupAction: () => Promise<void>
  resetRelayRuntimeAction: () => Promise<void>
}

export default function SetupTabWrapper({
  showSaved, showReset, showRelaySaved, showRelayReset, defaultSection, runtimeSection,
  resetDefaultSetupAction, resetRelayRuntimeAction,
}: TabWrapperProps) {
  const [tab, setTab] = useState<'default' | 'runtime'>('default')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success / Info banners */}
      {showSaved && (
        <div className="alert-banner alert-banner-success">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Default setup disimpan. Perangkat baru akan memakai konfigurasi ini saat registrasi berikutnya.
        </div>
      )}
      {showReset && (
        <div className="alert-banner alert-banner-info">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Default setup dikembalikan ke nilai bawaan aplikasi.
        </div>
      )}
      {showRelaySaved && (
        <div className="alert-banner alert-banner-success">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Runtime setting disimpan. Relay dan sinkron waktu akan memakai konfigurasi ini.
        </div>
      )}
      {showRelayReset && (
        <div className="alert-banner alert-banner-info">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Runtime setting dikembalikan ke fallback bawaan.
        </div>
      )}

      {/* Tab bar */}
      <div className="tab-list">
        <button type="button" className="tab-trigger" data-active={tab === 'default' ? '' : undefined} onClick={() => setTab('default')}>
          Default Setup
        </button>
        <button type="button" className="tab-trigger" data-active={tab === 'runtime' ? '' : undefined} onClick={() => setTab('runtime')}>
          Runtime Relay
        </button>
      </div>

      {/* Tab panels */}
      <div className={tab === 'default' ? 'space-y-6' : 'hidden'}>
        {defaultSection}
        <div className="sticky-footer">
          <ConfirmForm
            action={resetDefaultSetupAction}
            title="Reset Default Setup"
            description="Konfigurasi default akan dikembalikan ke nilai bawaan aplikasi."
            message="Reset Default Setup ke built-in defaults?"
            confirmLabel="Reset"
          >
            <button type="submit" className="btn btn-xs text-amber-400 border-amber-500/20 hover:bg-amber-500/10 rounded-lg">
              Reset ke Bawaan
            </button>
          </ConfirmForm>
        </div>
      </div>

      <div className={tab === 'runtime' ? 'space-y-6' : 'hidden'}>
        {runtimeSection}
        <div className="sticky-footer">
          <ConfirmForm
            action={resetRelayRuntimeAction}
            title="Reset Runtime Settings"
            description="Pengaturan relay akan dikembalikan ke fallback bawaan kode."
            message="Reset Runtime Settings ke built-in defaults?"
            confirmLabel="Reset"
          >
            <button type="submit" className="btn btn-xs text-amber-400 border-amber-500/20 hover:bg-amber-500/10 rounded-lg">
              Reset ke Bawaan
            </button>
          </ConfirmForm>
        </div>
      </div>
    </div>
  )
}
