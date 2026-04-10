import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('borrow_requests')
    .select('*, users!borrow_requests_requester_id_fkey(full_name, trust_score)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    item_name, description, lender_id, listing_id,
    // legacy date fields (still supported for non-slot listings)
    borrow_from, borrow_until,
    // slot-based fields
    selected_slots,   // array of {date} or {hourIndex}
  } = await req.json()

  if (!item_name || !lender_id)
    return NextResponse.json({ error: 'item_name and lender_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // ── Slot-based booking flow ──────────────────────────────
  if (listing_id && selected_slots && Array.isArray(selected_slots) && selected_slots.length > 0) {
    // 1. Fetch current listing slots
    const { data: listing, error: lErr } = await supabase
      .from('listings')
      .select('slots, duration_type, price_per_day, price_per_hour')
      .eq('id', listing_id)
      .single()

    if (lErr || !listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const currentSlots: any[] = listing.slots ?? []
    const durationType: string = listing.duration_type ?? 'day'

    // 2. Validate none of the requested slots are already booked
    for (const sel of selected_slots) {
      const match = durationType === 'day'
        ? currentSlots.find((s: any) => s.date === sel.date)
        : currentSlots.find((s: any) => s.hourIndex === sel.hourIndex)

      if (!match) return NextResponse.json({ error: `Slot not found: ${JSON.stringify(sel)}` }, { status: 400 })
      if (match.booked) return NextResponse.json({ error: `Slot already booked: ${JSON.stringify(sel)}` }, { status: 409 })
    }

    // 3. Mark selected slots as booked
    const updatedSlots = currentSlots.map((s: any) => {
      const isSelected = durationType === 'day'
        ? selected_slots.some((sel: any) => sel.date === s.date)
        : selected_slots.some((sel: any) => sel.hourIndex === s.hourIndex)
      return isSelected ? { ...s, booked: true } : s
    })

    // 4. Calculate price
    const count = selected_slots.length
    const totalPrice = durationType === 'day'
      ? count * (listing.price_per_day ?? 0)
      : count * (listing.price_per_hour ?? 0)

    // 5. Persist updated slots back to listing
    const { error: slotErr } = await supabase
      .from('listings')
      .update({ slots: updatedSlots })
      .eq('id', listing_id)

    if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 })

    // 6. Create borrow request with slot info
    const { data, error } = await supabase
      .from('borrow_requests')
      .insert({
        requester_id: userId,
        item_name,
        description,
        lender_id,
        listing_id,
        status: 'pending',
        selected_slots,
        total_price: totalPrice,
        duration_type: durationType,
        // keep legacy fields populated for display
        borrow_from: durationType === 'day' ? selected_slots[0].date : null,
        borrow_until: durationType === 'day' ? selected_slots[selected_slots.length - 1].date : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: requester } = await supabase.from('users').select('full_name').eq('id', userId).single()
    await supabase.from('notifications').insert({
      user_id: lender_id,
      type: 'request',
      title: 'New borrow request',
      body: (requester?.full_name ?? 'Someone') + ' wants to borrow "' + item_name + '"',
      href: '/borrow',
    })

    return NextResponse.json(data)
  }

  // ── Legacy (no-slot) flow — unchanged behaviour ──────────
  const { data, error } = await supabase
    .from('borrow_requests')
    .insert({ requester_id: userId, item_name, description, lender_id, listing_id, borrow_from, borrow_until, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: requester } = await supabase.from('users').select('full_name').eq('id', userId).single()
  await supabase.from('notifications').insert({
    user_id: lender_id,
    type: 'request',
    title: 'New borrow request',
    body: (requester?.full_name ?? 'Someone') + ' wants to borrow "' + item_name + '"',
    href: '/borrow',
  })

  return NextResponse.json(data)
}
