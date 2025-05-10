// import Image from "next/image";
import { FaLinkedin, FaXTwitter } from 'react-icons/fa6';
import FloatingShip from '@/components/FloatingShip';

// import GameOfLife from "@/components/GameOfLife";

export default function Home() {
    return (
        <div className='relative'>
            {/* <GameOfLife /> */}
            <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-instrument-sans)]'>
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
                        <h2 className='text-2xl font-bold pb-2'>
                        If it ships from Cornell, it probably started here.
                        </h2>
                        <div className='flex flex-col md:flex-row gap-4'>
                            <h3 className='text-xl font-semibold'>
                                What we are
                            </h3>
                            <ul className='list-disc list-inside'>
                                <li>
                                A self-selecting group of people who build
                                </li>
                                <li>We meet weekly & ship                           </li>
                                <li>
                                    Scale exclusively through the network effect
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className='flex flex-col gap-2'>
                        <p>
                            Our projects include{' '}
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
                                href='https://coldcraft.ai/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                ColdCraft
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
                                href='https://www.instagram.com/swoleai.app'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                SwoleAI
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
                                href='https://www.theoutdoorwholesaler.com/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                The Outdoor Wholesaler
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
                                href='https://bloux.co/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                BLOUX
                            </a>
                            , and many others.
                        </p>
                    </div>
                    <div className='flex flex-col gap-2'>
                        <div className='flex flex-col md:flex-row gap-4'>
                            <h3 className='text-xl font-semibold whitespace-nowrap pr-auto'>
                                Getting in
                            </h3>
                            <ul className='list-disc list-inside'>
                                <li>
                                If you're interested, reach out or network your way
                                    in
                                </li>
                                <li>
                                    We're looking for people who are obsessively
                                    passionate about making things, working on hard
                                    problems, and shipping
                                    projects
                                </li>
                                <li>
                                    Feel free to airdrop us any book
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

                    <p>
                    All empires die. Started in <a
                            className='underline underline-offset-4'
                            href='https://x.com/cornellarmada/status/1751712811011514641'
                            target='_blank'
                            rel='noopener noreferrer'
                        >Jan 2024</a> and will end in May 2027—on our terms, not entropy’s.
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
                </footer>
            </div>
        </div>
    );
}
