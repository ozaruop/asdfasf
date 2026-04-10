import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Support fetching another user's profile via ?user_id=xxx
  const { searchParams } = new URL(req.url)
  const targetId = searchParams.get('user_id') ?? userId

  const supabase = getSupabaseAdmin()

  const [
    { data: user },
    { count: soldCount },
    { count: borrowCount },
    { count: gigsCount },
    { data: reviews },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', targetId).single(),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('seller_id', targetId).eq('status', 'completed'),
    supabase.from('borrow_requests').select('*', { count: 'exact', head: true })
      .eq('requester_id', targetId),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('seller_id', targetId).eq('status', 'completed'),
    supabase.from('reviews').select('rating').eq('reviewee_id', targetId),
  ])

  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

  return NextResponse.json({
    user,
    stats: {
      itemsSold: soldCount ?? 0,
      borrowHistory: borrowCount ?? 0,
      gigsCompleted: gigsCount ?? 0,
      avgRating,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['full_name', 'college', 'avatar_url']
  const updates: Record<string, string> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
