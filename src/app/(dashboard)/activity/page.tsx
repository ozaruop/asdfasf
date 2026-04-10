'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, HandshakeIcon, Briefcase, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const typeConfig: Record<string, { icon: any; color: string }> = {
  listing: { icon: Package,       color: '#3525cd' },
  borrow:  { icon: HandshakeIcon, color: '#22c55e' },
  gig:     { icon: Briefcase,     color: '#712ae2' },
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',     color: '#3525cd', bg: '#e2dfff' },
  pending:   { label: 'Pending',    color: '#b45309', bg: '#fef3c7' },
  accepted:  { label: 'Accepted',  color: '#15803d', bg: '#dcfce7' },
  completed: { label: 'Completed', color: '#15803d', bg: '#dcfce7' },
  rejected:  { label: 'Declined',  color: '#b91c1c', bg: '#fee2e2' },
  returned:  { label: 'Returned',  color: '#464555', bg: '#edeeef' },
  cancelled: { label: 'Cancelled', color: '#b91c1c', bg: '#fee2e2' },
}

const card = { backgroundColor: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }

export default function ActivityPage() {
  const [data, setData] = useState<{ feed: any[]; stats: any } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activity')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', marginBottom: '8px' }}>My Activity</h1>
        <p style={{ fontSize: '15px', color: 'var(--on-surface-variant)' }}>Track all your transactions, borrows, and gigs in one place.</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '32px' }}>
        {loading ? [...Array(3)].map((_: any, i: number) => <div key={i} style={{ ...card, height: '100px' }} className="animate-pulse" />) :
        [
          { label: 'Total Listings', value: data?.feed?.filter(f => f.type === 'listing').length ?? 0, icon: Package },
          { label: 'Active Borrows', value: data?.stats?.activeBorrows ?? 0, icon: HandshakeIcon },
          { label: 'Gigs Completed', value: data?.stats?.gigsCompleted ?? 0, icon: Briefcase },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={{ ...card, padding: '20px', textAlign: 'center' }}>
            <Icon size={18} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Feed */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...Array(5)].map((_: any, i: number) => <div key={i} style={{ ...card, height: '76px' }} className="animate-pulse" />)}
        </div>
      ) : !data?.feed?.length ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>No activity yet</p>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Start by listing an item or browsing the marketplace!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.feed.map((item: any, idx: number) => {
            const tc = typeConfig[item.type] ?? typeConfig.listing
            const sc = statusConfig[item.status] ?? statusConfig.pending
            const Icon = tc.icon
            return (
              <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                <Link href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s' }}
                    onMouseEnter={(e: any) => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateX(4px)' }}
                    onMouseLeave={(e: any) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateX(0)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, backgroundColor: `${tc.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} style={{ color: tc.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '2px' }}>{item.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{item.subtitle}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} style={{ color: 'var(--outline)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--outline)' }}>
                          {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--outline)', flexShrink: 0 }} />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
