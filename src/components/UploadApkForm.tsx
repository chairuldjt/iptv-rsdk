'use client'

import { useState, useRef } from 'react'

type ApkInfo = {
  versionCode?: number
  versionName?: string
}

type UploadResponse = {
  success?: boolean
  message?: string
}

export default function UploadApkForm() {
  const [parsingState, setParsingState] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle')
  const [versionCode, setVersionCode] = useState<string>('')
  const [versionName, setVersionName] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [fileSize, setFileSize] = useState<string>('')
  
  // Upload progress states
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    // Convert bytes to MB
    const mbSize = (file.size / (1024 * 1024)).toFixed(2)
    setFileSize(`${mbSize} MB`)

    // Start parsing
    setParsingState('analyzing')
    setErrorMsg('')
    setUploadResult(null)

    try {
      // Dynamic import of app-info-parser to avoid server-side/build complications
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (parsingState !== 'success' || isUploading) return

    const formData = new FormData(e.currentTarget)
    setIsUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    const xhr = new XMLHttpRequest()

    // Track upload progress dynamically
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100)
        setUploadProgress(percentComplete)
      }
    }

    xhr.onload = () => {
      setIsUploading(false)
      try {
        const response = JSON.parse(xhr.responseText) as UploadResponse
        const isSuccess = xhr.status >= 200 && xhr.status < 300 && response.success === true
        
        setUploadResult({
          success: isSuccess,
          message: response.message || `HTTP ${xhr.status}: ${xhr.statusText}`
        })

        if (isSuccess) {
          // Reset form fields
          setParsingState('idle')
          setVersionCode('')
          setVersionName('')
          setFileName('')
          setFileSize('')
          setErrorMsg('')
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          formRef.current?.reset()
          
          // Refresh the page data so the history updates
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } catch {
        setUploadResult({
          success: false,
          message: `Gagal membaca respon server. Status HTTP: ${xhr.status}`
        })
      }
    }

    xhr.onerror = () => {
      setIsUploading(false)
      setUploadResult({
        success: false,
        message: 'Koneksi gagal. Periksa jaringan internet Anda atau pastikan ukuran file tidak diblokir oleh Nginx/Cloudflare.'
      })
    }

    xhr.open('POST', '/api/app-update/upload')
    xhr.send(formData)
  }

  return (
    <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-border h-fit">
      <h3 className="font-bold text-white text-lg mb-4">Deploy New Version</h3>
      
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* APK File Upload Area */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            APK Binary File
          </label>
          
          <input
            type="file"
            name="apkFile"
            ref={fileInputRef}
            accept=".apk"
            onChange={handleFileChange}
            className="hidden"
            id="apk-file-input"
            disabled={isUploading}
          />

          {parsingState === 'idle' && (
            <label
              htmlFor="apk-file-input"
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-900/30 rounded-2xl p-6 cursor-pointer group transition-all duration-200"
            >
              <svg className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-xs font-semibold text-slate-300">Pilih berkas APK</span>
              <span className="text-[10px] text-slate-500 mt-1">Seret & lepas atau klik untuk mencari</span>
            </label>
          )}

          {parsingState === 'analyzing' && (
            <div className="flex flex-col items-center justify-center border border-slate-800 bg-slate-950/20 rounded-2xl p-6">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs font-semibold text-slate-300">Membaca Manifest APK...</span>
              <span className="text-[10px] text-slate-500 mt-1">{fileName}</span>
            </div>
          )}

          {parsingState === 'success' && (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{fileName}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{fileSize}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold uppercase tracking-wider border border-emerald-500/20">
                    Auto-Detected
                  </span>
                </div>
              </div>
              {!isUploading && (
                <button
                  onClick={handleResetFile}
                  className="text-slate-500 hover:text-rose-400 p-1 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Ganti File"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {parsingState === 'error' && (
            <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">Analisis Gagal</p>
                  <p className="text-[10px] text-rose-400 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={handleResetFile}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Pilih Ulang
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Version Code (Integer) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Version Code (Integer)
            </label>
            {versionCode && (
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                Verified
              </span>
            )}
          </div>
          <input
            type="number"
            name="versionCode"
            required
            readOnly
            value={versionCode}
            min={1}
            placeholder="Auto-detected on file select"
            className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none font-mono cursor-not-allowed select-none opacity-80"
          />
          <p className="text-[10px] text-slate-500 mt-1">Nilai dibaca otomatis dari kode biner Manifest APK.</p>
        </div>

        {/* Version Name (String) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Version Name (String)
            </label>
            {versionName && (
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                Verified
              </span>
            )}
          </div>
          <input
            type="text"
            name="versionName"
            required
            readOnly
            value={versionName}
            placeholder="Auto-detected on file select"
            className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none cursor-not-allowed select-none opacity-80"
          />
        </div>

        {/* Changelog */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Changelog / Release Notes
          </label>
          <textarea
            name="changelog"
            rows={4}
            placeholder="List bug fixes, improvements, and features..."
            disabled={isUploading}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          />
        </div>

        {/* Real-time Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-indigo-400 animate-pulse">Mengunggah APK...</span>
              <span className="text-slate-300">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-150 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            {uploadProgress === 100 && (
              <p className="text-[10px] text-emerald-400 font-medium animate-pulse text-center">
                Unggahan selesai, server sedang memproses dan menyimpan berkas...
              </p>
            )}
          </div>
        )}

        {/* Status Message Alert */}
        {uploadResult && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
            uploadResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span className="mt-0.5">
              {uploadResult.success ? (
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </span>
            <span>{uploadResult.message}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={parsingState !== 'success' || isUploading}
          className={`w-full mt-2 py-3 rounded-xl font-bold text-white text-sm transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-2 ${
            parsingState === 'success' && !isUploading
              ? 'bg-primary hover:bg-indigo-500 glow-indigo'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/30'
          }`}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Mengunggah ({uploadProgress}%)</span>
            </>
          ) : parsingState === 'analyzing' ? (
            'Analyzing APK...'
          ) : parsingState === 'success' ? (
            'Upload & Save Update'
          ) : (
            'Pilih Berkas APK Terlebih Dahulu'
          )}
        </button>
      </form>
    </div>
  )
}
