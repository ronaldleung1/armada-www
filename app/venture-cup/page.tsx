import Image from 'next/image';
import Link from 'next/link';
import AnimatedBackButton from '@/components/AnimatedBackButton';
import ActionButton from '@/components/ActionButton';

export default function VentureCup() {
    return (
        <div className='relative'>
            <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-instrument-sans)]'>
                <main className='flex flex-col gap-8 row-start-2 items-center max-w-3xl'>
                    <AnimatedBackButton />

                    <div className='w-full'>
                        <Image
                            src='/venture-cup-transparent.png'
                            alt='The Venture Cup - March 8-15, 2025'
                            width={1200}
                            height={400}
                            className='w-full h-auto rounded-lg'
                            priority
                        />
                    </div>

                    <div className='text-center mt-2 mb-4'>
                        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-6 text-xl'>
                            <span className='font-light italic'>
                                All Armada friends and family invited
                            </span>
                        </div>
                    </div>

                    <div className='flex flex-col gap-4'>
                        <p className='text-lg'>
                            The Armada Venture Cup isn't your typical hackathon.
                            Rather than just building and{' '}
                            <code>localhost:3000</code>ing, participants will
                            have to (1) <strong>ship an app</strong> and (2)
                            &nbsp;<strong>market it to users</strong>. Talking
                            to users, iterating, and marketing your product are
                            amongst the most important parts of the startup
                            journey, yet it is overlooked by every single
                            conventional hackathon.
                        </p>

                        <p className='text-lg'>
                            Participants will be grouped into teams with
                            technical and nontechnical talent. Teams will ship
                            their app by the end of the weekend and spend the
                            week marketing the product and iterating. All teams
                            will convene the following weekend to review
                            progress, impressions, usage — and at the end —
                            choose the winner of the first Armada Venture Cup.
                        </p>
                    </div>

                    <div className='w-full mt-4'>
                        <h2 className='text-2xl font-bold mt-6 mb-4 border-b pb-2'>
                            Event Highlights
                        </h2>
                        <ul className='list-disc list-inside ml-4 space-y-3 text-lg'>
                            <li>
                                <span className='font-semibold'>Prize:</span>{' '}
                                The winning team will receive commemorative Oars
                            </li>
                            <li>
                                <span className='font-semibold'>Sponsors:</span>{' '}
                                <Link
                                    target='_blank'
                                    href='https://lifechanginglabs.com/'
                                    className='underline'
                                >
                                    Life Changing Labs
                                </Link>
                            </li>
                            <li>
                                <span className='font-semibold'>Food:</span>{' '}
                                Sunday dinner and continuous snacks & drinks
                                provided
                            </li>
                            <li>
                                <span className='font-semibold'>Support:</span>{' '}
                                API credits and subscriptions for all
                                participants as needed
                            </li>
                            <li>
                                <span className='font-semibold'>Swag:</span>{' '}
                                Custom Armada / Venture Cup merch (t-shirts &
                                stickers) for participants
                            </li>
                        </ul>
                    </div>

                    <div className='w-full flex justify-center mt-8'>
                        <ActionButton href='https://forms.gle/PbQfBiMm1yUb264SA'>
                            Learn more and register
                        </ActionButton>
                    </div>
                </main>
            </div>
        </div>
    );
}
