import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Native modal supplies background inertness, focus containment and Escape semantics. */
export function ModalDialog({
  headingId,
  onCancel,
  busy = false,
  children,
}: {
  headingId: string
  onCancel: () => void
  busy?: boolean
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    element.querySelector<HTMLElement>('[data-dialog-initial]')?.focus()
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
      else document.getElementById('page-heading')?.focus()
    }
  }, [])
  return createPortal(
    <dialog
      ref={dialog}
      className="dialog-panel"
      aria-labelledby={headingId}
      aria-modal="true"
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      {children}
    </dialog>,
    document.body,
  )
}
