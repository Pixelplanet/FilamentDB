'use client';

import { Suspense } from 'react';
import SpoolDetailClient from './client';
import { useSearchParams } from 'next/navigation';

function DetailContent() {
    const searchParams = useSearchParams();
    const serial = searchParams.get('serial');
    return <SpoolDetailClient initialSpool={null} serial={serial} />;
}

export default function SpoolDetailPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <Suspense fallback={<div className="p-8 text-center flex items-center justify-center gap-2"><div className="animate-spin w-4 h-4 border-2 border-primary rounded-full border-t-transparent" />Loading...</div>}>
                <DetailContent />
            </Suspense>
        </div>
    );
}
