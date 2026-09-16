import type { Metadata } from 'next';
import CrewApp from '@/components/crew/CrewApp';

export const metadata: Metadata = {
    title: 'Crew — Cornell Armada',
    description: 'Members only.',
    robots: { index: false, follow: false },
};

export default function CrewPage() {
    return <CrewApp />;
}
