import { useEffect, useRef } from 'react'

interface ModalProps {
    open: boolean
    onClose: () => void
    children: React.ReactNode
}

export function Modal({ open, onClose, children }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        if (open) document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} ref={overlayRef} />
            <div className="relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                    ✕
                </button>
                {children}
            </div>
        </div>
    )
}