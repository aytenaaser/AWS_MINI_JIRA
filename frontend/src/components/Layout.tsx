import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function Layout({ children }: { children: React.ReactNode }) {
    const { logout } = useAuth()

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">Mini Jira</h1>
                <Button variant="outline" onClick={logout}>Logout</Button>
            </header>
            <main className="p-4">{children}</main>
        </div>
    )
}