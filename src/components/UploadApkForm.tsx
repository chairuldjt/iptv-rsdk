'use client'

import { useState, useRef } from 'react'

type ApkInfo = { versionCode?: number; versionName?: string }
type UploadResponse = { success?: boolean; message?: string }

export default function UploadApkForm() {
  const [parsingState, setParsingState] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle')
  const [versionCode, setVersionCode] = useState<string>('')
  const [versionName, setVersionName] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [fileSize, setFileSize] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const mbSize = (file.size / (1024 * 1024)).toFixed(2)
    setFileSize(`${mbSize} MB`)
    setParsingState('analyzing')
    setErrorMsg('')
    setUploadResult(null)
    try {
      const AppInfoParserModule = await import('app-info-parser')
      const AppInfoParser = AppInfoParserModule.default
      const parser = new AppInfoParser(file)
      const result = await parser.parse() as ApkInfo
      if (result && result.versionCode !== undefined && result.versionName) {
        setVersionCode(String(result.versionCode))
        setVersionName(result.versionName)
        setParsingState('success')
      } else {
        throw new Error('Format APK tidak didukung atau Manifest tidak memiliki versionCode/versionName.')
      }
    } catch (err: unknown) {
      console.error('Error parsing APK client-side:', err)
      setParsingState('error')
      setVersionCode('')
      setVersionName('')
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menganalisis berkas APK. Pastikan berkas valid.')
    }
  }

  const handleResetFile = (e: React.MouseEvent) => {
    e.preventDefault()
    setParsingState('idle')
    setVersionCode('')
    setVersionName('')
    setFileName('')
    setFileSize('')
    setErrorMsg('')
    setUploadResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (parsingState !== 'success' || isUploading) return
    const formData = new FormData(e.currentTarget)
    setIsUploading(true)
    setUploadProgress(0)
    setUploadResult(null)
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      setIsUploading(false)
      try {
        const response = JSON.parse(xhr.responseText) as UploadResponse
        const isSuccess = xhr.status >= 200 && xhr.status < 300 && response.success === true
        setUploadResult({ success: isSuccess, message: response.message || `HTTP ${xhr.status}: ${xhr.statusText}` })
        if (isSuccess) {
          setParsingState('idle'); setVersionCode(''); setVersionName(''); setFileName(''); setFileSize(''); setErrorMsg('')
          if (fileInputRef.current) fileInputRef.current.value = ''
          formRef.current?.reset()
          setTimeout(() => { window.location.reload() }, 1500)
        }
      } catch {
        setUploadResult({ success: false, message: `Gagal membaca respon server. Status HTTP: ${xhr.status}` })
      }
    }
    xhr.onerror = () => {
      setIsUploading(false)
      setUploadResult({ success: false, message: 'Koneksi gagal. Periksa jaringan internet Anda atau pastikan ukuran file tidak diblokir oleh Nginx/Cloudflare.' })
    }
    xhr.open('POST', '/api/app-update/upload')
    xhr.send(formData)
  }

  return (
    <div className="lg:col-span-1 card p-6 rounded-2xl h-fit">
      <h3 className="font-bold text-foreground text-lg mb-4">Deploy New Version</h3>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">APK Binary File</label>
          <input type="file" name="apkFile" ref={fileInputRef} accept=".apk" onChange={handleFileChange} className="hidden" id="apk-file-input" disabled={isUploading} />

          {parsingState === 'idle' && (
            <label htmlFor="apk-file-input"
              className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 bg-background/40 hover:bg-accent/30 rounded-2xl p-6 cursor-pointer group transition-all duration-200">
              <svg className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-xs font-semibold text-foreground">Pilih berkas APK</span>
              <span className="text-[10px] text-muted-foreground mt-1">Seret & lepas atau klik untuk mencari</span>
            </label>
          )}

          {parsingState === 'analyzing' && (
            <div className="flex flex-col items-center justify-center border border-border bg-background/20 rounded-2xl p-6">
              <svg className="animate-spin h-8 w-8 text-primary mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs font-semibold text-foreground">Membaca Manifest APK...</span>
              <span className="text-[10px] text-muted-foreground mt-1">{fileName}</span>
            </div>
          )}

          {parsingState === 'success' && (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{fileName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fileSize}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="badge badge-success">Auto-Detected</span>
                </div>
              </div>
              {!isUploading && (
                <button onClick={handleResetFile} className="text-muted-foreground hover:text-rose-400 p-1 hover:bg-accent rounded-lg transition-colors cursor-pointer" title="Ganti File">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {parsingState === 'error' && (
            <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">Analisis Gagal</p>
                  <p className="text-[10px] text-rose-400 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={handleResetFile} className="btn btn-xs btn-ghost">Pilih Ulang</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version Code (Integer)</label>
            {versionCode && <span className="badge badge-success">Verified</span>}
          </div>
          <input type="number" name="versionCode" required readOnly value={versionCode} min={1}
            placeholder="Auto-detected on file select"
            className="field-input cursor-not-allowed select-none opacity-80" />
          <p className="text-[10px] text-muted-foreground mt-1">Nilai dibaca otomatis dari kode biner Manifest APK.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version Name (String)</label>
            {versionName && <span className="badge badge-success">Verified</span>}
          </div>
          <input type="text" name="versionName" required readOnly value={versionName}
            placeholder="Auto-detected on file select"
            className="field-input cursor-not-allowed select-none opacity-80" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Changelog / Release Notes</label>
          <textarea name="changelog" rows={4} placeholder="List bug fixes, improvements, and features..." disabled={isUploading}
            className="field-input" />
        </div>

        {isUploading && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-primary animate-pulse-glow">Mengunggah APK...</span>
              <span className="text-foreground">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-background border border-border rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-150 rounded-full" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {uploadResult && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
            uploadResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span className="mt-0.5">
              {uploadResult.success ? (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </span>
            <span>{uploadResult.message}</span>
          </div>
        )}

        <button type="submit" disabled={parsingState !== 'success' || isUploading}
          className={`w-full mt-2 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-2 ${
            parsingState === 'success' && !isUploading ? 'btn btn-primary' : 'btn btn-secondary opacity-50 cursor-not-allowed'
          }`}>
          {isUploading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Mengunggah ({uploadProgress}%)
            </>
          ) : parsingState === 'success' ? 'Upload & Save Update' : 'Pilih Berkas APK Terlebih Dahulu'}
        </button>
      </form>
    </div>
  )
}
