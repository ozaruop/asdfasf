import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const listingType = searchParams.get('type') // 'sell' | 'borrow' | null (all)

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('listings')
    .select('*, users(full_name, trust_score, avatar_url)')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (listingType === 'sell') {
    // Show items with listing_type = 'sell' OR items without a listing_type (legacy)
    query = query.or('listing_type.eq.sell,listing_type.is.null')
  } else if (listingType === 'borrow') {
    query = query.eq('listing_type', 'borrow')
  }
  // no filter = return all (used by home page)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, price, category, condition, images, listing_type } = body

  if (!title || !price || !category || !condition) {
    return NextResponse.json({ error: 'title, price, category and condition are required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('listings')
    .insert({
      user_id: userId,
      title: title.trim(),
      description: description?.trim() ?? '',
      price: parseFloat(price),
      category,
      condition: condition.toLowerCase().replace(' ', '_'),
      listing_type: listing_type ?? 'sell',
      images: images ?? [],
      is_available: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
