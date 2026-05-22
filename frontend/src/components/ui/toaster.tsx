import { useEffect, useState } from 'react'

interface Toast {
    id: number
    message: string
    type: 'success' | 'error'
}

let addToastFn: ((msg: string, type: 'success' | 'error') => void) | null = null

export function toaster(msg: string, type: 'success' | 'error' = 'success') {
    addToastFn?.(msg, type)
}

export function Toaster() {
    const [toasts, setToasts] = useState<Toast[]>([])

    useEffect(() => {
        addToastFn = (msg, type) => {
            const id = Date.now()
            setToasts((prev) => [...prev, { id, message: msg, type }])
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
        }
        return () => { addToastFn = null }
    }, [])

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`px-4 py-2 rounded shadow text-white ${
                        toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                    }`}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    )
}