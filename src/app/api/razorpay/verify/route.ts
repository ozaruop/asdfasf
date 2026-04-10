import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    db_order_id,
  } = await req.json()

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Update order to paid + completed
  const { data, error } = await supabase
    .from('orders')
    .update({
      razorpay_payment_id,
      payment_status: 'paid',
      status: 'completed',
    })
    .eq('id', db_order_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If listing purchase, mark it as sold
  if (data.listing_id) {
    await supabase
      .from('listings')
      .update({ is_available: false })
      .eq('id', data.listing_id)

    // Increment seller transactions
    const { data: seller } = await supabase
      .from('users')
      .select('total_transactions')
      .eq('id', data.seller_id)
      .single()
    if (seller) {
      await supabase
        .from('users')
        .update({ total_transactions: (seller.total_transactions ?? 0) + 1 })
        .eq('id', data.seller_id)
    }
  }

  return NextResponse.json({ success: true, order: data })
}
