import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * PATCH /api/borrow/[id]/return-flow
 *
 * Body shapes:
 *
 * Borrower marks as returned:
 *   { action: 'borrower_returned' }
 *   → status: 'return_requested', returned_by_borrower: true
 *
 * Lender confirms return:
 *   { action: 'lender_confirm', returned_on_time: boolean, item_damaged: boolean }
 *   → status: 'completed', confirmed_by_lender: true, returned_on_time, item_damaged
 *
 * Lender denies return (borrower didn't actually return):
 *   { action: 'lender_deny' }
 *   → status: 'accepted' (back to active)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { action } = body

  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Fetch the borrow request
  const { data: borrow, error: fetchErr } = await supabase
    .from('borrow_requests')
    .select('lender_id, requester_id, item_name, status')
    .eq('id', id)
    .single()

  if (fetchErr || !borrow)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let updatePayload: Record<string, unknown> = {}
  let notifyUserId: string | null = null
  let notifPayload: Record<string, string> | null = null

  // ── Borrower says "I returned it" ────────────────────────────────────────
  if (action === 'borrower_returned') {
    if (borrow.requester_id !== userId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!['accepted'].includes(borrow.status))
      return NextResponse.json({ error: 'Cannot mark as returned in current state' }, { status: 409 })

    updatePayload = {
      status: 'return_requested',
      returned_by_borrower: true,
      returned_at: new Date().toISOString(),
    }

    // Notify lender
    notifyUserId = borrow.lender_id
    notifPayload = {
      type: 'return_requested',
      title: 'Return confirmation needed',
      body: `"${borrow.item_name}" — the borrower says they've returned it. Please confirm.`,
      href: '/activity',
    }
  }

  // ── Lender confirms the item was returned ────────────────────────────────
  else if (action === 'lender_confirm') {
    if (borrow.lender_id !== userId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (borrow.status !== 'return_requested')
      return NextResponse.json({ error: 'No pending return to confirm' }, { status: 409 })

    const { returned_on_time, item_damaged } = body as {
      returned_on_time: boolean
      item_damaged: boolean
    }

    updatePayload = {
      status: 'completed',
      confirmed_by_lender: true,
      returned_on_time: returned_on_time ?? null,
      item_damaged: item_damaged ?? null,
      lender_confirmed_at: new Date().toISOString(),
    }

    // Notify borrower
    notifyUserId = borrow.requester_id
    notifPayload = {
      type: 'return_confirmed',
      title: 'Return confirmed!',
      body: `"${borrow.item_name}" return has been confirmed by the lender.`,
      href: '/activity',
    }
  }

  // ── Lender says "No, it hasn't been returned" ────────────────────────────
  else if (action === 'lender_deny') {
    if (borrow.lender_id !== userId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    updatePayload = {
      status: 'accepted',             // revert to active
      returned_by_borrower: false,
      returned_at: null,
    }

    // Notify borrower
    notifyUserId = borrow.requester_id
    notifPayload = {
      type: 'return_denied',
      title: 'Return not confirmed',
      body: `The lender says "${borrow.item_name}" hasn't been returned yet. Please check.`,
      href: '/activity',
    }
  }

  else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  // ── Apply update ──────────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('borrow_requests')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Send notification ─────────────────────────────────────────────────────
  if (notifyUserId && notifPayload) {
    await supabase.from('notifications').insert({
      user_id: notifyUserId,
      ...notifPayload,
    })
  }

  return NextResponse.json(data)
}