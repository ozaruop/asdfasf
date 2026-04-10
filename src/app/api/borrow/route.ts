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

  const { item_name, description, lender_id, listing_id, borrow_from, borrow_until } = await req.json()

  if (!item_name || !lender_id) {
    return NextResponse.json({ error: 'item_name and lender_id required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('borrow_requests')
    .insert({ requester_id: userId, item_name, description, lender_id, listing_id, borrow_from, borrow_until, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify lender
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
