'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, MapPin, Shield, Share2, Trash2, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'
import PayButton from '@/components/shared/PayButton'
import MessageModal from '@/components/shared/MessageModal'

const conditionColors: Record<string, { color: string; bg: string }> = {
  new:      { color: '#15803d', bg: '#dcfce7' },
  like_new: { color: '#1d4ed8', bg: '#dbeafe' },
  good:     { color: '#b45309', bg: '#fef3c7' },
  fair:     { color: '#c2410c', bg: '#ffedd5' },
}
const conditionLabels: Record<string, string> = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair',
}

// ── slot helpers ─────────────────────────────────────────────
function calcPrice(listing: any, selectedSlots: any[]): number {
  if (!selectedSlots.length) return 0
  if (listing.duration_type === 'day') return selectedSlots.length * (listing.price_per_day ?? 0)
  return selectedSlots.length * (listing.price_per_hour ?? 0)
}

function toggleSlot(selected: any[], slot: any, key: 'date' | 'hourIndex'): any[] {
  const exists = selected.some((s) => s[key] === slot[key])
  if (exists) return selected.filter((s) => s[key] !== slot[key])
  return [...selected, slot]
}

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useUser()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [wishlisted, setWishlisted] = useState(false)
  const [showBorrowForm, setShowBorrowForm] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  // legacy date fields (non-slot borrow)
  const [borrowFrom, setBorrowFrom] = useState('')
  const [borrowUntil, setBorrowUntil] = useState('')
  const [borrowMsg, setBorrowMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // slot selection
  const [selectedSlots, setSelectedSlots] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(r => r.json())
      .then(data => { setListing(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const isOwner = user?.id === listing?.user_id
  const isSlotBorrow = listing?.listing_type === 'borrow' && listing?.duration_type

  const handleShare = () => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!') }

  const handleDelete = async () => {
    if (!confirm('Delete this listing?')) return
    const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Listing deleted'); window.location.href = '/marketplace' }
    else toast.error('Failed to delete')
  }

  const handleMarkSold = async () => {
    const res = await fetch(`/api/listings/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: false }),
    })
    if (res.ok) { toast.success('Marked as sold'); setListing((p: any) => ({ ...p, is_available: false })) }
  }

  const handleBorrowSubmit = async () => {
    // slot-based
    if (isSlotBorrow) {
      if (selectedSlots.length === 0) { toast.error('Please select at least one slot'); return }
      setSubmitting(true)
      const res = await fetch('/api/borrow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: listing.title, description: borrowMsg,
          lender_id: listing.user_id, listing_id: listing.id,
          selected_slots: selectedSlots,
        }),
      })
      setSubmitting(false)
      if (res.ok) {
        toast.success('Borrow request sent!')
        setShowBorrowForm(false)
        setSelectedSlots([])
        // refresh listing to reflect booked slots
        fetch(`/api/listings/${id}`).then(r => r.json()).then(setListing)
      } else { const err = await res.json(); toast.error(err.error ?? 'Failed') }
      return
    }
    // legacy date-based
    if (!borrowFrom || !borrowUntil) { toast.error('Please fill in borrow dates'); return }
    setSubmitting(true)
    const res = await fetch('/api/borrow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name: listing.title, description: borrowMsg, lender_id: listing.user_id, listing_id: listing.id, borrow_from: borrowFrom, borrow_until: borrowUntil }),
    })
    setSubmitting(false)
    if (res.ok) { toast.success('Borrow request sent!'); setShowBorrowForm(false) }
    else { const err = await res.json(); toast.error(err.error ?? 'Failed') }
  }

  if (loading) return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ height: '32px', width: '160px', background: 'var(--surface-container)', borderRadius: '8px', marginBottom: '28px' }} className="animate-pulse" />
      <div className="two-col">
        <div style={{ height: '320px', background: 'var(--surface-container)', borderRadius: '20px' }} className="animate-pulse" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[60,90,40,70,55].map((w,i) => <div key={i} style={{ height: '24px', background: 'var(--surface-container)', borderRadius: '8px', width: `${w}%` }} className="animate-pulse" />)}
        </div>
      </div>
    </div>
  )

  if (!listing || listing.error) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <p style={{ fontSize: '18px', fontWeight: 700 }}>Listing not found.</p>
      <Link href="/marketplace" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'block', marginTop: '8px' }}>Back to Marketplace</Link>
    </div>
  )

  const images = listing.images?.length ? listing.images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&h=600&fit=crop']
  const cond = conditionColors[listing.condition] ?? { color: '#464555', bg: '#edeeef' }
  const seller = listing.users
  const slots: any[] = listing.slots ?? []
  const slotKey = listing.duration_type === 'hour' ? 'hourIndex' : 'date'
  const estimatedPrice = isSlotBorrow ? calcPrice(listing, selectedSlots) : 0

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Link href="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--on-surface-variant)', textDecoration: 'none', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>

      {!listing.is_available && (
        <div style={{ backgroundColor: '#fee2e2', borderRadius: '12px', padding: '12px 20px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, color: '#b91c1c' }}>
          This item is no longer available.
        </div>
      )}

      <div className="two-col">
        {/* Images */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ borderRadius: '20px', overflow: 'hidden', height: '320px', background: 'var(--surface-container)' }}>
            <img src={images[selectedImage]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setSelectedImage(i)} style={{ width: '68px', height: '68px', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${i === selectedImage ? 'var(--primary)' : 'var(--border)'}`, padding: 0, cursor: 'pointer' }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Details */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: cond.bg, color: cond.color }}>{conditionLabels[listing.condition] ?? listing.condition}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}>{listing.category}</span>
            {listing.listing_type === 'borrow' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: '#dcfce7', color: '#15803d' }}>🤝 For Borrow</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
            <h1 style={{ fontSize: 'clamp(18px,4vw,22px)', fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.3, fontFamily: 'var(--font-manrope)', flex: 1 }}>{listing.title}</h1>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => setWishlisted(!wishlisted)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: wishlisted ? '#ef4444' : 'var(--on-surface-variant)' }}>
                <Heart size={16} fill={wishlisted ? '#ef4444' : 'none'} />
              </button>
              <button onClick={handleShare} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* Price */}
          <div style={{ fontSize: 'clamp(28px,6vw,36px)', fontWeight: 800, marginBottom: '24px', fontFamily: 'var(--font-manrope)' }} className="signature-gradient-text">
            {isSlotBorrow
              ? (listing.duration_type === 'day' ? `₹${Number(listing.price_per_day).toLocaleString()}/day` : `₹${Number(listing.price_per_hour).toLocaleString()}/hr`)
              : `₹${Number(listing.price).toLocaleString()}`}
          </div>

          {/* Action buttons */}
          {isOwner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {listing.is_available && (
                <button onClick={handleMarkSold} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>Mark as Sold</button>
              )}
              <button onClick={handleDelete} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Trash2 size={16} /> Delete Listing
              </button>
            </div>
          ) : listing.is_available ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {(listing.listing_type ?? 'sell') === 'sell' && (
                <PayButton type="listing" itemId={listing.id} price={Number(listing.price)} sellerName={seller?.full_name}
                  label={`Buy Now · ₹${Number(listing.price).toLocaleString()}`} className="signature-gradient"
                  style={{ width: '100%', padding: '16px', borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '15px', border: 'none', boxShadow: '0 8px 25px rgba(53,37,205,0.3)', fontFamily: 'var(--font-manrope)' }}
                  onSuccess={() => setListing((p: any) => ({ ...p, is_available: false }))} />
              )}

              <button onClick={() => setShowMessageModal(true)} style={{ width: '100%', padding: '14px', borderRadius: '14px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', border: '2px solid var(--primary)', background: 'transparent', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-manrope)' }}>
                <MessageCircle size={16} /> {(listing.listing_type ?? 'sell') === 'borrow' ? 'Contact Lender' : 'Contact Seller'}
              </button>

              {(listing.listing_type ?? 'sell') === 'borrow' && (
                <button onClick={() => setShowBorrowForm(!showBorrowForm)} style={{ width: '100%', padding: '13px', borderRadius: '14px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#3525cd,#712ae2)', color: 'white', fontFamily: 'var(--font-manrope)', boxShadow: '0 4px 15px rgba(53,37,205,0.3)' }}>
                  {showBorrowForm ? 'Cancel' : '🤝 Request to Borrow'}
                </button>
              )}

              {showBorrowForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: 'var(--surface-container-low)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Borrow Details</p>

                  {/* ── Slot picker ── */}
                  {isSlotBorrow && slots.length > 0 ? (
                    <>
                      <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
                        Select {listing.duration_type === 'day' ? 'days' : 'hours'} — tap to toggle. <span style={{ color: '#b91c1c' }}>Grey = booked.</span>
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        {slots.map((slot: any, i: number) => {
                          const key = listing.duration_type === 'hour' ? 'hourIndex' : 'date'
                          const isBooked = slot.booked
                          const isSelected = selectedSlots.some((s) => s[key] === slot[key])
                          return (
                            <button key={i} disabled={isBooked}
                              onClick={() => setSelectedSlots(prev => toggleSlot(prev, slot, key))}
                              style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                cursor: isBooked ? 'not-allowed' : 'pointer', border: '2px solid', transition: 'all 0.15s',
                                ...(isBooked
                                  ? { backgroundColor: 'var(--surface-container)', color: 'var(--outline)', borderColor: 'var(--border)', opacity: 0.5 }
                                  : isSelected
                                    ? { backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }
                                    : { backgroundColor: 'var(--card)', color: 'var(--on-surface)', borderColor: 'var(--border)' })
                              }}>
                              {listing.duration_type === 'hour' ? slot.label : slot.date}
                            </button>
                          )
                        })}
                      </div>
                      {selectedSlots.length > 0 && (
                        <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: 'var(--primary-light)', marginBottom: '10px' }}>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                            {selectedSlots.length} {listing.duration_type === 'day' ? 'day(s)' : 'hour(s)'} selected · Total: ₹{estimatedPrice.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </>
                  ) : !isSlotBorrow ? (
                    /* legacy date pickers */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: '4px' }}>From</label>
                        <input type="date" value={borrowFrom} onChange={e => setBorrowFrom(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: '4px' }}>Until</label>
                        <input type="date" value={borrowUntil} onChange={e => setBorrowUntil(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none' }} />
                      </div>
                    </div>
                  ) : null}

                  <textarea value={borrowMsg} onChange={e => setBorrowMsg(e.target.value)} placeholder="Why do you need this? (optional)" rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'none', marginBottom: '10px' }} />
                  <button onClick={handleBorrowSubmit} disabled={submitting} className="signature-gradient" style={{ width: '100%', padding: '12px', borderRadius: '10px', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Sending...' : `Send Borrow Request${estimatedPrice > 0 ? ` · ₹${estimatedPrice.toLocaleString()}` : ''}`}
                  </button>
                </motion.div>
              )}
            </div>
          ) : null}

          {/* Safe exchange */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', background: '#dcfce7', marginBottom: '20px' }}>
            <Shield size={16} style={{ color: '#15803d', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>Safe Exchange Hub — meet at Student Union, Main Entrance</p>
          </div>

          {/* Seller card */}
          {seller && (
            <div style={{ background: 'var(--surface-container-low)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '10px', color: 'var(--outline)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Seller</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {seller.avatar_url ? <img src={seller.avatar_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                  : <div className="signature-gradient" style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px' }}>{seller.full_name?.[0] ?? '?'}</div>}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)' }}>{seller.full_name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{seller.total_transactions ?? 0} transactions</p>
                </div>
                <div style={{ padding: '6px 12px', borderRadius: '999px', background: 'var(--primary-light)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>★ {seller.trust_score ?? 50}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <MapPin size={13} style={{ color: 'var(--outline)' }} />
                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Campus · Safe Exchange Zone</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {listing.description && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-manrope)', marginBottom: '12px' }}>Description</h2>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', lineHeight: 1.8 }}>{listing.description}</p>
        </motion.div>
      )}

      {seller && !isOwner && (
        <MessageModal isOpen={showMessageModal} onClose={() => setShowMessageModal(false)} receiver={seller} listingId={listing.id} listingTitle={listing.title} />
      )}
    </div>
  )
}
