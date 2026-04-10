import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  const [
    { data: listings },
    { data: borrowSent },
    { data: borrowReceived },
    { data: ordersBuyer },
    { data: ordersSeller },
    { count: completedCount },
    { count: activeBorrows },
    { count: gigsCount },
  ] = await Promise.all([
    supabase.from('listings').select('id, title, price, category, created_at, is_available')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('borrow_requests')
      .select('id, item_name, status, created_at, users!borrow_requests_lender_id_fkey(full_name)')
      .eq('requester_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('borrow_requests')
      .select('id, item_name, status, created_at, users!borrow_requests_requester_id_fkey(full_name)')
      .eq('lender_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('orders')
      .select('id, amount, status, created_at, gigs(title)')
      .eq('buyer_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('orders')
      .select('id, amount, status, created_at, gigs(title)')
      .eq('seller_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('seller_id', userId).eq('status', 'completed'),
    supabase.from('borrow_requests').select('*', { count: 'exact', head: true })
      .eq('requester_id', userId).in('status', ['pending', 'accepted']),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('seller_id', userId).eq('status', 'completed'),
  ])

  // Build unified activity feed
  const feed: Array<{
    id: string
    type: string
    title: string
    subtitle: string
    time: string
    status: string
    href: string
  }> = []

  for (const l of listings ?? []) {
    feed.push({
      id: `listing-${l.id}`,
      type: 'listing',
      title: `You listed "${l.title}"`,
      subtitle: `₹${Number(l.price).toLocaleString()} · ${l.category}`,
      time: l.created_at,
      status: l.is_available ? 'active' : 'completed',
      href: `/marketplace/${l.id}`,
    })
  }

  for (const b of borrowSent ?? []) {
    const lenderName = (b.users as any)?.full_name ?? 'someone'
    feed.push({
      id: `borrow-sent-${b.id}`,
      type: 'borrow',
      title: `Borrow request for "${b.item_name}"`,
      subtitle: `From ${lenderName}`,
      time: b.created_at,
      status: b.status,
      href: '/borrow',
    })
  }

  for (const b of borrowReceived ?? []) {
    const requesterName = (b.users as any)?.full_name ?? 'someone'
    feed.push({
      id: `borrow-recv-${b.id}`,
      type: 'borrow',
      title: `Borrow request received for "${b.item_name}"`,
      subtitle: `From ${requesterName}`,
      time: b.created_at,
      status: b.status,
      href: '/borrow',
    })
  }

  for (const o of ordersBuyer ?? []) {
    const gigTitle = (o.gigs as any)?.title ?? 'a gig'
    feed.push({
      id: `order-buy-${o.id}`,
      type: 'gig',
      title: `You hired "${gigTitle}"`,
      subtitle: `₹${Number(o.amount).toLocaleString()}`,
      time: o.created_at,
      status: o.status,
      href: '/gigs',
    })
  }

  for (const o of ordersSeller ?? []) {
    const gigTitle = (o.gigs as any)?.title ?? 'your gig'
    feed.push({
      id: `order-sell-${o.id}`,
      type: 'gig',
      title: `Order received for "${gigTitle}"`,
      subtitle: `₹${Number(o.amount).toLocaleString()}`,
      time: o.created_at,
      status: o.status,
      href: '/gigs',
    })
  }

  // Sort by time descending
  feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return NextResponse.json({
    feed: feed.slice(0, 20),
    stats: {
      totalTransactions: (completedCount ?? 0) + (listings?.length ?? 0),
      activeBorrows: activeBorrows ?? 0,
      gigsCompleted: gigsCount ?? 0,
    },
  })
}
