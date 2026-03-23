import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function PageNotFound() {
    const location = useLocation();
    const navigate = useNavigate();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch {
                return { user: null, isAuthenticated: false };
            }
        }
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#080d14]">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-2">
                    <img
                        src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c6fc7fe29_LogoROKI2.png"
                        alt="ROKI"
                        className="w-8 h-8 object-contain"
                        style={{ mixBlendMode: 'screen', filter: 'sepia(1) saturate(5) hue-rotate(155deg) brightness(1.2)' }}
                    />
                    <span className="text-white font-bold text-lg">ROKI</span>
                </div>

                {/* 404 */}
                <div>
                    <p className="text-[120px] font-black leading-none text-white/[0.04] select-none">404</p>
                    <div className="-mt-8 space-y-2">
                        <h1 className="text-2xl font-bold text-white">Page not found</h1>
                        <p className="text-gray-500 text-sm">
                            <span className="font-mono text-gray-400">/{pageName}</span> doesn't exist in this app.
                        </p>
                    </div>
                </div>

                {/* Admin note */}
                {isFetched && authData?.isAuthenticated && authData.user?.role === 'admin' && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-left">
                        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">Admin Note</p>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            This page hasn't been implemented yet. Ask the AI to build it in the chat.
                        </p>
                    </div>
                )}

                {/* Action */}
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-sm font-medium rounded-xl transition-all"
                >
                    ← Go Home
                </button>
            </div>
        </div>
    );
}