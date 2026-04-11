'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Sparkles, Clock, Calendar } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const categories = ['Books', 'Electronics', 'Clothes', 'Sports', 'Other']
const conditions = ['New', 'Like New', 'Good', 'Fair']

const suggestedPrices: Record<string, number> = {
  Books: 350, Electronics: 5000, Clothes: 400, Sports: 800, Other: 500,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: 'var(--on-surface)', marginBottom: '8px', fontFamily: 'var(--font-manrope)',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '12px',
  border: '1px solid var(--border)', backgroundColor: 'var(--surface-container-low)',
  color: 'var(--on-surface)', fontSize: '14px', outline: 'none',
  fontFamily: 'var(--font-inter)', transition: 'border-color 0.2s',
}

const today = new Date().toISOString().split('T')[0]

export default function NewListingPage() {
  const router = useRouter()

  // Core
  const [listingType, setListingType] = useState<'sell' | 'borrow'>('sell')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [loading, setLoading] = useState(false)

  // Image
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Borrow — duration mode
  const [durationType, setDurationType] = useState<'day' | 'hour'>('day')

  // Borrow — day mode
  const [pricePerDay, setPricePerDay] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Borrow — hour mode
  const [pricePerHour, setPricePerHour] = useState('')
  const [startHour, setStartHour] = useState('9')   // 9 AM default
  const [totalHours, setTotalHours] = useState('8')  // 8 slots default

  const isBorrow = listingType === 'borrow'
  const suggested = category ? suggestedPrices[category] : null

  // ── Image upload ────────────────────────────────────────────────
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Only image files are accepted'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5MB.'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '')
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      )
      const data: { secure_url?: string; error?: { message: string } } = await res.json()
      if (!data.secure_url) throw new Error(data.error?.message ?? 'Upload failed')
      setImageUrl(data.secure_url)
      toast.success('Image uploaded!')
    } catch {
      toast.error('Upload failed. Check Cloudinary settings.')
    } finally {
      setUploading(false)
    }
  }

  // ── Validation ──────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!title.trim()) return 'Listing title is required'
    if (!category) return 'Category is required'
    if (!isBorrow) {
      if (!price || Number(price) <= 0) return 'Price is required for sell listings'
      if (!condition) return 'Item condition is required'
    } else {
      if (durationType === 'day') {
        if (!pricePerDay || Number(pricePerDay) <= 0) return 'Price per day is required'
        if (!fromDate || !toDate) return 'Availability date range is required'
        if (toDate < fromDate) return 'End date must be after start date'
      } else {
        if (!pricePerHour || Number(pricePerHour) <= 0) return 'Price per hour is required'
        const hours = Number(totalHours)
        const start = Number(startHour)
        if (isNaN(hours) || hours < 1 || hours > 24) return 'Total hours must be between 1 and 24'
        if (isNaN(start) || start < 0 || start > 23) return 'Start hour must be between 0 and 23'
      }
    }
    return null
  }

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        category,
        images: imageUrl ? [imageUrl] : [],
        listing_type: listingType,
        // Sell-only fields — safe defaults for borrow
        price: isBorrow ? 0 : price,
        condition: isBorrow ? 'good' : condition,
      }

      if (isBorrow) {
        payload.duration_type = durationType
        if (durationType === 'day') {
          payload.price_per_day = Number(pricePerDay)
          payload.from_date = fromDate
          payload.to_date = toDate
        } else {
          payload.price_per_hour = Number(pricePerHour)
          payload.slot_start_hour = Number(startHour)
          payload.slot_total_hours = Number(totalHours)
        }
      }

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data: { error?: string } = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Something went wrong')
        return
      }

      toast.success(isBorrow ? 'Item listed for borrowing! 🤝' : 'Listing posted! 🎉')
      router.push('/marketplace')
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  // ── Hour preview ────────────────────────────────────────────────
  const hourPreview = (() => {
    const s = Number(startHour)
    const t = Number(totalHours)
    if (isNaN(s) || isNaN(t) || t < 1) return null
    const fmt = (h: number) => {
      const hour = h % 24
      return `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
    }
    return `${fmt(s)} → ${fmt(s + t - 1)} (${t} slot${t > 1 ? 's' : ''})`
  })()

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <Link href="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--on-surface-variant)', textDecoration: 'none', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'var(--card)', borderRadius: '24px', padding: '36px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', marginBottom: '4px' }}>
          Create Listing
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '28px' }}>
          Turn your unused items into campus currency.
        </p>

        {/* ── Listing Type Toggle ── */}
        <div style={{ marginBottom: '28px' }}>
          <label style={labelStyle}>Listing Type <span style={{ color: 'var(--error)' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {([
              ['sell', '🛍️', 'Sell Item', 'List for purchase'],
              ['borrow', '🤝', 'Lend for Borrowing', 'Let others borrow'],
            ] as const).map(([type, emoji, ttl, sub]) => (
              <button key={type} onClick={() => setListingType(type)}
                style={{ padding: '14px 16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', border: '2px solid', ...(listingType === type ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-light)' } : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container-low)' }) }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{emoji}</div>
                <p style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'var(--font-manrope)', color: listingType === type ? 'var(--primary)' : 'var(--on-surface)', marginBottom: '2px' }}>{ttl}</p>
                <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Image Upload ── */}
        <div
          style={{ border: '2px dashed var(--outline-variant)', borderRadius: '20px', padding: '36px', textAlign: 'center', marginBottom: '24px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--surface-container-low)', overflow: 'hidden' }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'var(--primary-light)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline-variant)'; e.currentTarget.style.backgroundColor = 'var(--surface-container-low)' }}
        >
          <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileInputRef} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
          {uploading ? (
            <><div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Upload size={22} style={{ color: 'var(--primary)' }} /></div><p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>Uploading...</p></>
          ) : imageUrl ? (
            <><img src={imageUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }} /><p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Click to replace image</p></>
          ) : (
            <><div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Upload size={22} style={{ color: 'var(--outline)' }} /></div><p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>Upload visual assets</p><p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>Drag and drop, or click to browse (Max 5MB)</p></>
          )}
        </div>

        {/* ── Title ── */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Listing Title <span style={{ color: 'var(--error)' }}>*</span></label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. MacBook Air M1, Calculus Textbook..." style={inputStyle} />
        </div>

        {/* ── Description ── */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Tell us about this item</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder={isBorrow ? 'Describe the item, its condition, pickup location...' : 'Describe condition, included accessories, reason for selling...'}
            rows={4} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
        </div>

        {/* ── Category — always shown ── */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Category <span style={{ color: 'var(--error)' }}>*</span></label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* ── Sell fields ── */}
        <AnimatePresence>
          {!isBorrow && (
            <motion.div key="sell" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              {/* Price */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Price (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min="1" style={inputStyle} />
                {suggested && (
                  <button onClick={() => setPrice(suggested.toString())} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                    <Sparkles size={12} /> Suggested: ₹{suggested.toLocaleString()}
                  </button>
                )}
              </div>
              {/* Condition */}
              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>Item Condition <span style={{ color: 'var(--error)' }}>*</span></label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {conditions.map(c => (
                    <button key={c} onClick={() => setCondition(c)} style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: '2px solid', cursor: 'pointer', transition: 'all 0.2s', ...(condition === c ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' } : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }) }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Borrow fields ── */}
        <AnimatePresence>
          {isBorrow && (
            <motion.div key="borrow" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '28px' }}>

              {/* Duration type selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Borrowing Mode <span style={{ color: 'var(--error)' }}>*</span></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([['day', '📅', 'By Day'], ['hour', '⏰', 'By Hour']] as const).map(([mode, emoji, lbl]) => (
                    <button key={mode} onClick={() => setDurationType(mode)}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', ...(durationType === mode ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-light)' } : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container-low)' }) }}>
                      <div style={{ fontSize: '18px', marginBottom: '2px' }}>{emoji}</div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: durationType === mode ? 'var(--primary)' : 'var(--on-surface)' }}>{lbl}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Day-wise fields */}
              <AnimatePresence>
                {durationType === 'day' && (
                  <motion.div key="day-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    {/* Price per day */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} style={{ color: 'var(--primary)' }} />
                          Price per Day (₹) <span style={{ color: 'var(--error)' }}>*</span>
                        </span>
                      </label>
                      <input type="number" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} placeholder="e.g. 50" min="1" style={inputStyle} />
                    </div>
                    {/* Availability window */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} style={{ color: 'var(--primary)' }} />
                          Available From → To <span style={{ color: 'var(--error)' }}>*</span>
                        </span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input type="date" value={fromDate} min={today} onChange={e => { setFromDate(e.target.value); if (toDate && e.target.value > toDate) setToDate('') }} style={inputStyle} />
                        <input type="date" value={toDate} min={fromDate || today} onChange={e => setToDate(e.target.value)} style={inputStyle} />
                      </div>
                      {fromDate && toDate && (
                        <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                          📅 Borrowers can pick any days between {new Date(fromDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} and {new Date(toDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hour-wise fields */}
              <AnimatePresence>
                {durationType === 'hour' && (
                  <motion.div key="hour-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    {/* Price per hour */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} style={{ color: 'var(--primary)' }} />
                          Price per Hour (₹) <span style={{ color: 'var(--error)' }}>*</span>
                        </span>
                      </label>
                      <input type="number" value={pricePerHour} onChange={e => setPricePerHour(e.target.value)} placeholder="e.g. 20" min="1" style={inputStyle} />
                    </div>
                    {/* Slot config */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} style={{ color: 'var(--primary)' }} />
                          Available Hours <span style={{ color: 'var(--error)' }}>*</span>
                        </span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Start Hour (0–23)</label>
                          <input type="number" value={startHour} onChange={e => setStartHour(e.target.value)} placeholder="9" min="0" max="23" style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Total Slots (1–24)</label>
                          <input type="number" value={totalHours} onChange={e => setTotalHours(e.target.value)} placeholder="8" min="1" max="24" style={inputStyle} />
                        </div>
                      </div>
                      {hourPreview && (
                        <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                          ⏰ Borrowers can book slots: {hourPreview}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Submit ── */}
        <button onClick={handleSubmit} disabled={loading || uploading} className="signature-gradient"
          style={{ width: '100%', padding: '16px', borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '15px', border: 'none', cursor: (loading || uploading) ? 'not-allowed' : 'pointer', opacity: (loading || uploading) ? 0.7 : 1, transition: 'opacity 0.2s', fontFamily: 'var(--font-manrope)', boxShadow: '0 8px 25px rgba(53,37,205,0.3)' }}>
          {loading ? 'Posting...' : isBorrow ? 'Post for Borrowing →' : 'Post Listing →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--outline)', marginTop: '16px' }}>
          By posting, you agree to our Campus Marketplace guidelines.
        </p>
      </motion.div>
    </div>
  )
}
