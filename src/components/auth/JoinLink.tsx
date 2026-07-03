'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from './auth-provider'
import { AlreadyRegisteredModal } from './AlreadyRegisteredModal'

interface JoinLinkProps {
  href?: string
  className?: string
  children: React.ReactNode
}

// Wraps the "הצטרפי" registration links — if the visitor is already logged in,
// clicking one would otherwise send them through the whole /login?tab=register
// flow just to land on an inline "this email is already registered" error.
// Show that same information immediately instead, with no page navigation.
export function JoinLink({ href = '/login?tab=register', className, children }: JoinLinkProps) {
  const { user, role } = useAuth()
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Link
        href={href}
        className={className}
        onClick={(e) => {
          if (user) {
            e.preventDefault()
            setShowModal(true)
          }
        }}
      >
        {children}
      </Link>
      {showModal && <AlreadyRegisteredModal role={role} onClose={() => setShowModal(false)} />}
    </>
  )
}
