import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  if (!['pending', 'accepted', 'completed', 'cancelled'].includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('buyer_id, seller_id, amount, gigs(title)')
    .eq('id', id)
    .single()

  if (orderError || !order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = order.seller_id === userId || order.buyer_id === userId
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const gigTitle = (order.gigs as any)?.title ?? 'your order'

  // Send notifications based on status change
  if (status === 'accepted' && order.seller_id === userId) {
    await supabase.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'accepted',
      title: 'Order accepted!',
      body: '"' + gigTitle + '" has been accepted by the seller',
      href: '/activity',
    })
  }

  if (status === 'completed') {
    // Notify buyer
    await supabase.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'accepted',
      title: 'Order completed!',
      body: '"' + gigTitle + '" marked as complete. Please leave a review!',
      href: '/activity',
    })

    // Update seller transaction count (FIXED)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_transactions: supabase.rpc('increment_transactions', {
          uid: order.seller_id,
        }),
      })
      .eq('id', order.seller_id)

    if (updateError) {
      console.error('Failed to update transactions:', updateError)
    }
  }

  return NextResponse.json(data)
}