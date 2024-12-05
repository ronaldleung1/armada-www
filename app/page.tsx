import Image from "next/image";
import {FaLinkedin, FaXTwitter } from 'react-icons/fa6';

// import GameOfLife from "@/components/GameOfLife";

export default function Home() {
  return (
    <div className="relative">
      {/* <GameOfLife /> */}
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-instrument-sans)]">
        <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start max-w-3xl">
          <div className="flex flex-col items-center">
            <Image
              src="https://github.com/ronaldleung1/armada-www/blob/main/public/ship.png?raw=true"
              alt="Armada Logo"
              width={180}
              height={38}
              priority
            />
            <h1 className="text-5xl font-['Jacquard_12']">ARMADA</h1>
            <h3 className="text-xl font-semibold">theoria cum praxi</h3>
          </div>
          <h2 className="text-2xl font-bold">We are the home for Cornell’s most ambitious builders</h2>

          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-semibold">Some stuff about us:</h3>
            <ul className="list-disc list-inside">
              <li>We are a community of builders working on passion projects</li>
              <li>Meet weekly for building sessions</li>
              <li>Scale exclusively through the network effect</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <p>
              Our projects include{' '}
              <a
                className="underline underline-offset-4"
                href="https://bigredbeds.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                BigRedBeds
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://coldcraft.ai/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ColdCraft
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://oasis-of-ideas.com/?utm_source=armadawebsite"
                target="_blank"
                rel="noopener noreferrer"
              >
                Oasis of Ideas
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://ronaldjabouinjr.com/getmehome.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                GetMeHome
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://samaritanscout.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Samaritan Scout
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://chromewebstore.google.com/detail/whats-that-course/amnpkieecicdklmhdjjhfhjflkfphmag"
                target="_blank"
                rel="noopener noreferrer"
              >
                What's that Course?
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://www.instagram.com/swoleai.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                SwoleAI
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://auntfloskitchen.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Aunt Flo's Kitchen
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://www.theoutdoorwholesaler.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                The Outdoor Wholesaler
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://locadapt.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Locadapt
              </a>,{' '}
              <a
                className="underline underline-offset-4"
                href="https://bloux.co/"
                target="_blank"
                rel="noopener noreferrer"
              >
                BLOUX
              </a>, and many others.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-semibold">Contact:</h3>
            <ul className="list-disc list-inside">
              <li>We don't have a 3-stage interview process, if you're interested, reach out or network your way in</li>
              <li>We're looking for people who are obsessively passionate about making things, working on hard problems, and shipping (not yapping about) projects</li>
              <li>Feel free to airdrop us LLM API tokens, any book by <a className="underline underline-offset-4" href="https://press.stripe.com/" target="_blank" rel="noopener noreferrer">Stripe Press</a>, or <a className="underline underline-offset-4" href="https://www.seriouseats.com/soft-frosted-sugar-cookies-homemade-lofthouse" target="_blank" rel="noopener noreferrer">Frosted Sugar Cookies</a></li>
              <li>You can reach out via <a className="underline underline-offset-4" href="https://x.com/cornellarmada" target="_blank" rel="noopener noreferrer">𝕏</a></li>
            </ul>
          </div>

          {/* <a
            className="flex flex-row gap-2 rounded-full items-center bg-black px-4 py-2 text-white hover:bg-black/75 transition mt-4"
            href="https://lu.ma/armada"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaBell size={16} />
            Subscribe to new events
          </a> */}
        </main>
        <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm opacity-80">
          <a
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="https://twitter.com/cornellarmada"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaXTwitter size={16} aria-hidden />
            X/Twitter
          </a>
          <a
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="https://www.linkedin.com/company/armadaship"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin size={16} aria-hidden />
            LinkedIn
          </a>
        </footer>
      </div>
    </div>
  );
}
