'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Shirt, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Navigation() {
    const pathname = usePathname();

    const links = [
        { href: '/closet', label: 'Closet', icon: Shirt },
        { href: '/', label: 'Mirror', icon: Camera },
        { href: '/stylist', label: 'Stylist', icon: Sparkles },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
            <nav className="glass-panel rounded-full px-6 py-3 flex justify-between items-center shadow-2xl shadow-black/50">
                {links.map((link) => {
                    const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                    const Icon = link.icon;

                    return (
                        <Link key={link.href} href={link.href} className="relative group">
                            <div className={cn(
                                "p-3 rounded-full transition-all duration-300 flex flex-col items-center gap-1",
                                isActive ? "text-white" : "text-gray-400 hover:text-gray-200"
                            )}>
                                <div className="relative">
                                    <Icon className={cn("w-6 h-6 transition-transform duration-300", isActive && "scale-110")} />
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-glow"
                                            className="absolute inset-0 bg-primary/50 blur-lg rounded-full -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </div>
                                <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-black/80 px-2 py-1 rounded text-white whitespace-nowrap pointer-events-none">
                                    {link.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
