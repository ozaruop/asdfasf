import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { status } = await req.json()

  if (!['accepted', 'rejected', 'returned'].includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: borrow } = await supabase
    .from('borrow_requests')
    .select('lender_id, requester_id, item_name')
    .eq('id', id)
    .single()

  if (!borrow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canUpdate =
    (status === 'returned' && borrow.requester_id === userId) ||
    (['accepted', 'rejected'].includes(status) && borrow.lender_id === userId)

  if (!canUpdate) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updatePayload: Record<string, unknown> = { status }
  if (status === 'returned') updatePayload.returned_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('borrow_requests')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify requester of accept/reject
  if (['accepted', 'rejected'].includes(status)) {
    await supabase.from('notifications').insert({
      user_id: borrow.requester_id,
      type: status === 'accepted' ? 'accepted' : 'rejected',
      title: status === 'accepted' ? 'Borrow request accepted!' : 'Borrow request declined',
      body: '"' + borrow.item_name + '" has been ' + status,
      href: '/borrow',
    })
  }

  return NextResponse.json(data)
}
