'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KonfirmasiEmailPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/masuk');
  }, [router]);

  return null;
}
