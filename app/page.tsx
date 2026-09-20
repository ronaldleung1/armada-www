// import Image from "next/image";
import Link from 'next/link';
import { FaAnchor, FaLinkedin, FaXTwitter } from 'react-icons/fa6';
import FloatingShip from '@/components/FloatingShip';

// import GameOfLife from "@/components/GameOfLife";

const STRUCTURED_DATA = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': 'https://armada.build/#org',
            name: 'Cornell Armada',
            alternateName: ['Armada', 'Armada at Cornell', 'Cornell Armada builders club'],
            url: 'https://armada.build',
            logo: 'https://armada.build/3x2.png',
            image: 'https://armada.build/ship.png',
            slogan: 'We ship.',
            description:
                "The independent builders' club at Cornell, not affiliated with the university. A group of students who build side projects and startups, meet weekly, and ship. Since January 2024: hackathon wins at BigRedHacks, HackMIT, Hack the North and Cornell BOOM, and 70% of Cornell's Y Combinator Summer 2025 admits.",
            foundingDate: '2024-01',
            foundingLocation: { '@type': 'Place', name: 'Ithaca, New York, United States' },
            location: { '@type': 'Place', name: 'Ithaca, New York, United States' },
            knowsAbout: ['startups', 'side projects', 'hackathons', 'software engineering', 'Y Combinator', 'entrepreneurship', 'shipping products'],
            sameAs: ['https://twitter.com/cornellarmada', 'https://x.com/cornellarmada', 'https://www.linkedin.com/company/armadaship'],
            sponsor: [
                { '@type': 'Organization', name: 'Y Combinator', url: 'https://www.ycombinator.com/' },
                { '@type': 'Organization', name: 'Infisical', url: 'https://infisical.com/' },
                { '@type': 'Organization', name: 'Anthropic', url: 'https://www.anthropic.com/' },
                { '@type': 'Organization', name: 'Ithaca Hummus', url: 'https://ithacahummus.com/' },
            ],
        },
        {
            '@type': 'WebSite',
            '@id': 'https://armada.build/#website',
            url: 'https://armada.build',
            name: 'Cornell Armada',
            publisher: { '@id': 'https://armada.build/#org' },
            inLanguage: 'en-US',
        },
    ],
};

export default function Home() {
    return (
        <div className='relative'>
            <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
            {/* <GameOfLife /> */}
            <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 gap-16 sm:p-20 font-[family-name:var(--font-instrument-sans)]'>
                <main className='flex flex-col gap-8 row-start-2 items-center sm:items-start max-w-2xl'>
                    <div className='flex flex-row items-center justify-between w-full'>
                        <div className="hidden sm:block">
                            <FloatingShip />
                        </div>
                        <div className='mt-[100px] mr-auto'>
                            <div className='w-[180px] h-auto'>
                                <img src="/3x2.png" alt="3x2 Logo" className="w-full h-auto" />
                            </div>
                        </div>
                    </div>
                    


                    {/* <div className='flex flex-col items-center w-full mb-4'>
                        <ActionButton href='/venture-cup'>
                            <div className='flex items-center gap-2'>
                                <FaShip size={16} />
                                <span>The Venture Cup — March 8 – 15, 2025</span>
                            </div>
                        </ActionButton>
                    </div> */}

                    <div className='flex flex-col gap-2'>
                        {/* <h2 className='text-5xl pb-2' style={{fontFamily: '"Jacquard 12", monospace'}}>
                        "Ship, don't sink." —Unknown
                        </h2> */}
                        <h2 className='text-2xl font-bold pb-2'>
                        If it ships from Cornell, it probably started here.
                        </h2>
                        <div className='flex flex-col md:flex-row gap-4'>
                            <h3 className='text-xl font-semibold'>
                                What we are
                            </h3>
                            <ul className='list-disc list-inside'>
                                <li>
                                A group of people who build side projects and businesses
                                </li>
                                <li>
                                We meet weekly & ship                           
                                </li>
                                <li>
                                Self-select for people who ship rather than yap
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className='flex flex-col gap-2'>
                        <p>
                            Our members' projects include{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://bigredbeds.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                BigRedBeds
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://candytrail.ai/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Candytrail
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://oasis-of-ideas.com/?utm_source=armadawebsite'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Oasis of Ideas
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://ronaldjabouinjr.com/getmehome.html'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                GetMeHome
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://samaritanscout.org/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Samaritan Scout
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://chromewebstore.google.com/detail/whats-that-course/amnpkieecicdklmhdjjhfhjflkfphmag'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                What's that Course?
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://apps.apple.com/us/app/restitch/id6749212071'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                ReStitch
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://auntfloskitchen.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Aunt Flo's Kitchen
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://www.getfilmify.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Filmify
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://verduslabs.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Verdus Labs
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://locadapt.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Locadapt
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://www.designmeetup.info/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Design Meetup
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://home.prysmapp.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Prysm
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://apps.apple.com/us/app/beartrak-for-cornell/id6737151761'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                BearTrak
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://apps.apple.com/us/app/lingofable/id6759223711'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Lingofable
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://sklonuj.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Sklonuj
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://head.surf/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Head Surf
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://chromewebstore.google.com/detail/mode-ai-fashion-stylist/bbgigkgmodajaobdfalekpaolpolebnm'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                MODE
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://gcalwrapped.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                GCal Wrapped
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://www.virre.ai'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Virre
                            </a>
                            ,{' '}
                            <a
                                className='underline underline-offset-4'
                                href='https://getzybit.com'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Zybit
                            </a>
                            , and many others.
                        </p>
                    </div>
                    <div className='flex flex-col gap-2'>
                        <div className='flex flex-col md:flex-row gap-4'>
                            <h3 className='text-xl font-semibold whitespace-nowrap pr-auto'>
                                Since forming
                            </h3>
                            <ul className='list-disc list-inside'>
                                <li>
                                We've swept hackathons: BigRedHacks, HackMIT, HackTheNorth, Cornell BOOM, etc.
                                </li>
                                <li>
                                Had members chronically drop out (of school)
                                </li>
                                <li>
                                Funneled 70% of Cornell YC Summer 2025 admits
                                </li>
                                <li>
                                We don't like people who spend all day recruiting. We don't like people who largely yap and perpetually push off shipping. We love people who are obsessively passionate about making things and working on hard problems. If you're interested,{' '}
                                <a
                                    href='https://http.cat/511'
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='hover:text-[var(--carnelian)] transition-colors'
                                >
                                    find your way in
                                </a>
                                .
                                </li>
                                <li>
                                    We accept treats, like books
                                    by{' '}
                                    <a
                                        className='underline underline-offset-4'
                                        href='https://press.stripe.com/'
                                        target='_blank'
                                        rel='noopener noreferrer'
                                    >
                                        Stripe Press
                                    </a>
                                    , or{' '}
                                    <a
                                        className='underline underline-offset-4'
                                        href='https://www.seriouseats.com/soft-frosted-sugar-cookies-homemade-lofthouse'
                                        target='_blank'
                                        rel='noopener noreferrer'
                                    >
                                        Frosted Sugar Cookies
                                    </a>
                                </li>
                            </ul>
                        </div>
                        
                    </div>

                    {/* <p>
                    All empires die. Started in <a
                            className='underline underline-offset-4'
                            href='https://x.com/cornellarmada/status/1751712811011514641'
                            target='_blank'
                            rel='noopener noreferrer'
                        >Jan 2024</a> and will end in May 2027—on our terms, not entropy’s.
                    </p> */}
                    <p>
                    "Hurry up and fail" —John W. Gardner, <em>Self-Renewal</em> (1964)
                    </p>
                    <p>
                    Supported by Jared Friedman (<a className='underline underline-offset-4' href='https://www.ycombinator.com/' target='_blank' rel='noopener noreferrer'>Y Combinator</a>), Tony Dang '21 (<a className='underline underline-offset-4' href='https://infisical.com/' target='_blank' rel='noopener noreferrer'>Infisical</a>), <a className='underline underline-offset-4' href='https://www.anthropic.com/' target='_blank' rel='noopener noreferrer'>Anthropic</a>, and fed by <a className='underline underline-offset-4' href='https://ithacahummus.com/' target='_blank' rel='noopener noreferrer'>Ithaca Hummus</a>.
                    </p>
                    {/* <div className='flex flex-row gap-4'>
                            <h3 className='text-xl font-semibold'>
                                Past events
                            </h3>
                            <h3>
                                <a href='/venture-cup'>Regatta I</a>
                            </h3>
                            
                        </div> */}

                </main>
                <footer className='row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm opacity-80'>
                    <a
                        className='flex items-center gap-2 hover:underline hover:underline-offset-4'
                        href='https://twitter.com/cornellarmada'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <FaXTwitter size={16} aria-hidden />
                        X/Twitter
                    </a>
                    <a
                        className='flex items-center gap-2 hover:underline hover:underline-offset-4'
                        href='https://www.linkedin.com/company/armadaship'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <FaLinkedin size={16} aria-hidden />
                        LinkedIn
                    </a>
                    <Link
                        className='flex items-center gap-2 hover:underline hover:underline-offset-4'
                        href='/crew'
                    >
                        <FaAnchor size={14} aria-hidden />
                        Crew
                    </Link>
                </footer>
            </div>
        </div>
    );
}
