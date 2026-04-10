import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  // Import inside handler to avoid module-level crash when env vars missing
  const Razorpay = (await import('razorpay')).default
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })

  const body = await req.json()
  const { type, id } = body

  const supabase = getSupabaseAdmin()

  let amount = 0
  let sellerId = ''
  let title = ''
  let orderInsert: Record<string, unknown> = {}

  if (type === 'listing') {
    const { data: listing } = await supabase
      .from('listings')
      .select('price, user_id, title, is_available')
      .eq('id', id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (!listing.is_available) return NextResponse.json({ error: 'Item no longer available' }, { status: 400 })
    if (listing.user_id === userId) return NextResponse.json({ error: 'Cannot buy your own listing' }, { status: 400 })

    amount = Math.round(listing.price * 100)
    sellerId = listing.user_id
    title = listing.title
    orderInsert = {
      buyer_id: userId,
      seller_id: sellerId,
      amount: listing.price,
      listing_id: id,
      status: 'pending',
      payment_status: 'unpaid',
    }
  } else if (type === 'gig') {
    const { data: gig } = await supabase
      .from('gigs')
      .select('price, user_id, title, is_available')
      .eq('id', id)
      .single()

    if (!gig) return NextResponse.json({ error: 'Gig not found' }, { status: 404 })
    if (!gig.is_available) return NextResponse.json({ error: 'Gig not available' }, { status: 400 })
    if (gig.user_id === userId) return NextResponse.json({ error: 'Cannot hire your own gig' }, { status: 400 })

    amount = Math.round(gig.price * 100)
    sellerId = gig.user_id
    title = gig.title
    orderInsert = {
      buyer_id: userId,
      seller_id: sellerId,
      amount: gig.price,
      gig_id: id,
      status: 'pending',
      payment_status: 'unpaid',
    }
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  try {
    const rzpOrder = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { buyer_id: userId, seller_id: sellerId, type, item_id: id },
    })

    const { data: dbOrder, error } = await supabase
      .from('orders')
      .insert({ ...orderInsert, razorpay_order_id: rzpOrder.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      razorpay_order_id: rzpOrder.id,
      amount,
      currency: 'INR',
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      db_order_id: dbOrder.id,
      title,
      seller_id: sellerId,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Payment error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
