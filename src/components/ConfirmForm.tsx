'use client'

import React from 'react'

interface ConfirmFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  action: (formData: FormData) => void | Promise<void>
  message: string
  children: React.ReactNode
}

export default function ConfirmForm({
  action,
  message,
  children,
  ...props
}: ConfirmFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm(message)) {
      e.preventDefault()
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  )
}
