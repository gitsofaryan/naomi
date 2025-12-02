'use client';

import { useEffect, useState } from 'react';
import { getClothes, addCloth, deleteCloth } from '@/lib/db';
import { Plus, Trash2, Shirt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Cloth = {
    id: string;
    image: Blob;
    category: string;
};

export default function ClosetPage() {
    const [clothes, setClothes] = useState<Cloth[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadClothes();
    }, []);

    async function loadClothes() {
        const items = await getClothes();
        setClothes(items);
        setIsLoading(false);
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            await addCloth(file, 'top'); // Default to top for now
            loadClothes();
        }
    }

    async function handleDelete(id: string) {
        await deleteCloth(id);
        loadClothes();
    }

    return (
        <div className="min-h-screen bg-black p-6 pb-24">
            <header className="flex justify-between items-center mb-8 mt-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Digital Closet
                    </h1>
                    <p className="text-gray-400 text-sm">Your AI-curated wardrobe</p>
                </div>
                <label className="bg-white text-black px-4 py-2 rounded-full font-medium cursor-pointer hover:bg-gray-200 transition flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Item
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
            </header>

            {isLoading ? (
                <div className="flex justify-center mt-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <AnimatePresence>
                        {clothes.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative aspect-[3/4] group rounded-2xl overflow-hidden glass border-white/5"
                            >
                                <img
                                    src={URL.createObjectURL(item.image)}
                                    alt="Cloth"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs text-white/80 capitalize">
                                    {item.category}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {clothes.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 gap-4 border-2 border-dashed border-white/10 rounded-3xl">
                            <Shirt className="w-12 h-12 opacity-20" />
                            <p>Your closet is empty.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
