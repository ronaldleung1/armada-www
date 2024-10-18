import Image from "next/image";
import { FaLinkedin, FaXTwitter } from 'react-icons/fa6';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-instrument-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex flex-col items-center">
          <Image
            src="/ship.png"
            alt="Armada Logo"
            width={180}
            height={38}
            priority
          />
          <h1 className="text-5xl font-[family-name:var(--font-instrument-serif)]">armada</h1>
        </div>
        <h2 className="text-2xl font-bold">We are the home for Cornell’s most ambitious builders</h2>
        <p>We support everyone from poets to programmers. Our goal is to steer a small, high-density collective of builders to ship passion and commercial projects.</p>

        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold">How?</h3>
          <ul className="list-disc list-inside">
            <li>Create a consistent time + space for people to build</li>
            <li>Form a tight-knit community with resources and support</li>
            <li>Implement unique accountability strategies to incentivize shipping</li>
            <li>Recruit freshmen and sophomores by tapping for individuals that have a demonstrated interest in building things/breaking rules (e.g. someone with several side projects on GitHub rather than someone that just talks about “building things”)</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold">Passion Projects Shipped @ Armada</h3>
          <p>
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
              href="https://latexify-ai.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Latexify
            </a>,{' '}
            <a
              className="underline underline-offset-4"
              href="https://oasis-of-ideas.com/"
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
            </a>, and{' '}
            <a
              className="underline underline-offset-4"
              href="https://chromewebstore.google.com/detail/whats-that-course/amnpkieecicdklmhdjjhfhjflkfphmag"
              target="_blank"
              rel="noopener noreferrer"
            >
              What’s that Course?
            </a>.
          </p>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm opacity-80">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://twitter.com/cornellarmada"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaXTwitter size={16} aria-hidden />
          Twitter/X
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
  );
}
