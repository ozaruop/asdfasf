'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'

export function useUserSync() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded || !user) return

    const syncUser = async () => {
      // ── CHANGED: select is_first_login in addition to id ──────────────────
      const { data: existing } = await supabase
        .from('users')
        .select('id, trust_score, is_first_login')
        .eq('id', user.id)
        .single()

      if (!existing) {
        // ── NEW USER: create with trust_score = 50 and is_first_login = false
        // (bonus is baked into the initial score — no second pass needed)
        await supabase.from('users').insert({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress ?? '',
          full_name: user.fullName ?? '',
          avatar_url: user.imageUrl ?? '',
          trust_score: 50,           // ← was 0, now 50 for new users
          total_transactions: 0,
          is_first_login: false,     // ← mark consumed immediately
        })
      } else if (existing.is_first_login === true) {
        // ── EXISTING USER who hasn't received the bonus yet: grant it once ──
        await supabase
          .from('users')
          .update({
            trust_score: (existing.trust_score ?? 0) + 50,
            is_first_login: false,   // ← never runs again
          })
          .eq('id', user.id)
      }
      // ── ELSE: user exists and already received bonus → do nothing ──────────
    }

    syncUser()
  }, [isLoaded, user])
}
