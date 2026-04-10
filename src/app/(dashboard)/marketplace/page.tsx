'use client'

import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const categories = ['All Items', 'Books', 'Electronics', 'Clothes', 'Sports', 'Other']

const conditionColors: Record<string, string> = {
  'new': 'bg-green-100 text-green-700',
  'like_new': 'bg-blue-100 text-blue-700',
  'good': 'bg-yellow-100 text-yellow-700',
  'fair': 'bg-orange-100 text-orange-700',
}

const conditionLabels: Record<string, string> = {
  'new': 'New',
  'like_new': 'Like New',
  'good': 'Good',
  'fair': 'Fair',
}

const fallbackImages = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop',
]

export default function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState('All Items')
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/listings?type=sell')
      .then((r) => r.json())
      .then((data) => {
        setListings(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = listings.filter((l) => {
    const matchType = !l.listing_type || l.listing_type === 'sell'
    const matchCat = activeCategory === 'All Items' || l.category === activeCategory
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase())
    return matchType && matchCat && matchSearch
  })

  return (
    <div>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '32px' }}
      >
        <h1 style={{
          fontSize: '48px',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-1px',
          color: 'var(--text-1)',
        }}>
          Find what you{' '}
          <span style={{ color: '#6C47FF' }}>need,</span>
          <br />
          trade what you{' '}
          <span style={{ color: '#6C47FF' }}>don&apos;t.</span>
        </h1>
        <p style={{
          color: 'var(--text-2)',
          marginTop: '12px',
          fontSize: '17px',
        }}>
          The exclusive circular economy for your campus community.
        </p>
      </motion.div>

      {/* Search + Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            color: 'var(--text-3)',
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for textbooks, electronics, dorm gear..."
            style={{
              width: '100%',
              paddingLeft: '48px',
              paddingRight: '16px',
              paddingTop: '14px',
              paddingBottom: '14px',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)',
              color: 'var(--text-1)',
              fontSize: '14px',
              outline: 'none',
              boxShadow: 'var(--shadow)',
            }}
          />
        </div>
        <button style={{
          padding: '14px 16px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow)',
          color: 'var(--text-2)',
        }}>
          <SlidersHorizontal size={18} />
        </button>
      </motion.div>

      {/* Category Pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: activeCategory === cat ? '#6C47FF' : 'var(--card)',
              color: activeCategory === cat ? 'white' : 'var(--text-2)',
              borderColor: activeCategory === cat ? '#6C47FF' : 'var(--border)',
              boxShadow: activeCategory === cat ? '0 4px 15px rgba(108,71,255,0.3)' : 'none',
            }}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Loading Skeletons */}
      {loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              backgroundColor: 'var(--card)',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}>
              <div style={{ height: '208px', backgroundColor: 'var(--bg)' }} className="animate-pulse" />
              <div style={{ padding: '20px' }}>
                <div style={{ height: '16px', backgroundColor: 'var(--bg)', borderRadius: '8px', width: '75%', marginBottom: '12px' }} className="animate-pulse" />
                <div style={{ height: '12px', backgroundColor: 'var(--bg)', borderRadius: '8px', width: '50%' }} className="animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', paddingTop: '80px', paddingBottom: '80px' }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)' }}>
            No listings yet
          </p>
          <p style={{ color: 'var(--text-2)', marginTop: '8px' }}>
            Be the first to post something on campus!
          </p>
          <Link href="/marketplace/new">
            <button style={{
              marginTop: '24px',
              padding: '14px 32px',
              borderRadius: '16px',
              backgroundColor: '#6C47FF',
              color: 'white',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(108,71,255,0.3)',
            }}>
              Post a Listing
            </button>
          </Link>
        </motion.div>
      )}

      {/* Listings Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {filtered.map((listing, idx) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Link href={`/marketplace/${listing.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  backgroundColor: 'var(--card)',
                  borderRadius: '24px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow)',
                  transition: 'box-shadow 0.3s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', height: '208px', overflow: 'hidden' }}>
                    <img
                      src={listing.images?.[0] ?? fallbackImages[idx % fallbackImages.length]}
                      alt={listing.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                      ₹{Number(listing.price).toLocaleString()}
                    </span>
                    <span className={`absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-semibold ${conditionColors[listing.condition] ?? 'bg-gray-100 text-gray-600'}`}
                      style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      {conditionLabels[listing.condition] ?? listing.condition}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '20px' }}>
                    <h3 style={{
                      fontWeight: 700,
                      fontSize: '15px',
                      color: 'var(--text-1)',
                      lineHeight: 1.4,
                      marginBottom: '4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {listing.title}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
                      {listing.category}
                    </p>

                    {/* Seller Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border)',
                      marginBottom: '14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#6C47FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}>
                          {listing.users?.full_name?.[0] ?? '?'}
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 500 }}>
                          {listing.users?.full_name ?? 'Unknown'}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--primary-light)',
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                          ★ {listing.users?.trust_score ?? 50}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => { e.preventDefault(); window.location.href = `/marketplace/${listing.id}` }}
                        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#3525cd,#712ae2)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Buy Now
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); window.location.href = `/chat?user=${listing.user_id}` }}
                        style={{ padding: '10px 12px', borderRadius: '12px', border: '2px solid var(--border)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        title="Message seller"
                      >
                        💬
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <Link href="/marketplace/new" style={{ textDecoration: 'none' }}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#6C47FF',
            color: 'white',
            fontSize: '24px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(108,71,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +
        </motion.button>
      </Link>
    </div>
  )
}