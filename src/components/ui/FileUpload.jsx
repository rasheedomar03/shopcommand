import { useState, useRef } from 'react'
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react'
import { uploadFile } from '@/lib/uploads'
import { cn } from '@/lib/utils'

const ICON_MAP = {
  'image/jpeg': Image,
  'image/png': Image,
  'image/webp': Image,
  'application/pdf': FileText,
}

export function FileUpload({ roId, category = 'document', onUpload, className }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFiles = async (files) => {
    if (!files?.length) return
    setUploading(true)
    setError(null)

    try {
      const results = []
      for (const file of Array.from(files)) {
        const result = await uploadFile(file, { roId, category })
        results.push(result)
      }
      onUpload?.(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
          uploading
            ? 'border-orange/40 bg-orange/[0.02]'
            : 'border-border hover:border-orange/40 hover:bg-orange/[0.02]'
        )}
      >
        {uploading ? (
          <Loader2 size={20} className="text-orange animate-spin" />
        ) : (
          <Upload size={20} className="text-text-muted" />
        )}
        <div className="text-center">
          <p className="text-xs text-text-secondary">
            {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-2xs text-text-muted mt-0.5">
            Images, PDFs, documents. Max 10MB each.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function FileList({ files = [], onDelete }) {
  if (!files.length) return null

  return (
    <div className="space-y-1.5">
      {files.map((file, i) => {
        const Icon = ICON_MAP[file.contentType] || FileText
        return (
          <div key={file.url || i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-background border border-border">
            <Icon size={14} className="text-text-muted flex-shrink-0" />
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-primary hover:text-orange truncate flex-1"
            >
              {file.filename || file.pathname?.split('/').pop() || 'File'}
            </a>
            {onDelete && (
              <button
                onClick={() => onDelete(file)}
                className="text-text-muted hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
