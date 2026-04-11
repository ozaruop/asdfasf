import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const listingType = searchParams.get('type')

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('listings')
    .select('*, users(full_name, trust_score, avatar_url)')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (listingType === 'sell') {
    query = query.or('listing_type.eq.sell,listing_type.is.null')
  } else if (listingType === 'borrow') {
    query = query.eq('listing_type', 'borrow')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title, description, price, category, condition, images, listing_type,
    duration_type, price_per_day, price_per_hour, from_date, to_date, slot_from_date, slot_to_date,
    slot_total_hours, slot_start_hour,
  } = body

  const isBorrow = listing_type === 'borrow'

  // title and category always required; price only required for sell
  if (!title || !category) {
    return NextResponse.json({ error: 'title and category are required' }, { status: 400 })
  }
  if (!isBorrow && !price) {
    return NextResponse.json({ error: 'price is required for sell listings' }, { status: 400 })
  }
  if (!isBorrow && !condition) {
    return NextResponse.json({ error: 'condition is required for sell listings' }, { status: 400 })
  }
  if (isBorrow && !duration_type) {
    return NextResponse.json({ error: 'duration_type is required for borrow listings' }, { status: 400 })
  }
  if (isBorrow && duration_type === 'day' && !price_per_day) {
    return NextResponse.json({ error: 'price_per_day is required for day-wise borrow listings' }, { status: 400 })
  }
  if (isBorrow && duration_type === 'hour' && !price_per_hour) {
    return NextResponse.json({ error: 'price_per_hour is required for hour-wise borrow listings' }, { status: 400 })
  }

  // Compute the stored price column:
  // For sell → use price directly
  // For borrow day → price_per_day (so the card shows the per-day rate)
  // For borrow hour → price_per_hour
  let computedPrice: number
  if (isBorrow) {
    computedPrice = duration_type === 'day'
      ? parseFloat(price_per_day)
      : parseFloat(price_per_hour)
  } else {
    computedPrice = parseFloat(price)
  }

  const supabase = getSupabaseAdmin()
  const insert: Record<string, unknown> = {
    user_id: userId,
    title: title.trim(),
    description: description?.trim() ?? '',
    price: computedPrice,
    category,
    condition: condition ? condition.toLowerCase().replace(' ', '_') : 'good',
    listing_type: listing_type ?? 'sell',
    images: images ?? [],
    is_available: true,
  }

  if (isBorrow) {
    insert.duration_type = duration_type
    if (duration_type === 'day') {
      insert.price_per_day = parseFloat(price_per_day)
      insert.from_date = from_date ?? slot_from_date ?? null
      insert.to_date = to_date ?? slot_to_date ?? null
    } else {
      insert.price_per_hour = parseFloat(price_per_hour)
      // store total hours and start hour for building slot grid on detail page
      if (slot_total_hours) insert.slot_total_hours = parseInt(slot_total_hours)
      if (slot_start_hour !== undefined) insert.slot_start_hour = parseInt(slot_start_hour)
    }
  }

  const { data, error } = await supabase.from('listings').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
