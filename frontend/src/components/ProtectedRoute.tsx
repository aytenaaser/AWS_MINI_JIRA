import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { token } = useAuth()

    if (!token) {
        return <div className="flex h-screen items-center justify-center">Redirecting to login…</div>
    }

    return <>{children}</>
}