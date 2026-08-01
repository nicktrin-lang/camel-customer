"use client";

import { useState } from "react";
import Link from "next/link";

export type GuideListEntry = {
  href: string;
  title: string;
  description?: string;
  dateLabel?: string;
};

const PAGE = 6;

// Post list with a "Show more" control — reveals 6 at a time so the index stays
// short no matter how many guides exist. Resets on navigation (country switch
// reloads the page, remounting this).
export default function GuidePostList({ posts }: { posts: GuideListEntry[] }) {
  const [count, setCount] = useState(PAGE);
  const visible = posts.slice(0, count);

  return (
    <>
      <ul className="divide-y divide-black/10">
        {visible.map((g) => (
          <li key={g.href} className="py-7 first:pt-0">
            <Link href={g.href} className="group block">
              {g.dateLabel && (
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#ff7a00]">
                  {g.dateLabel}
                </p>
              )}
              <h2 className="text-2xl font-black leading-snug text-black transition-colors group-hover:text-[#ff7a00] md:text-3xl">
                {g.title}
              </h2>
              {g.description && (
                <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-black/60">
                  {g.description}
                </p>
              )}
              <span className="mt-3 inline-block text-sm font-black uppercase tracking-widest text-black transition-colors group-hover:text-[#ff7a00]">
                Read guide →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {count < posts.length && (
        <div className="mt-12">
          <button
            type="button"
            onClick={() => setCount((c) => c + PAGE)}
            className="inline-block border-2 border-black bg-black px-10 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-transparent hover:text-black"
          >
            Show more
          </button>
        </div>
      )}
    </>
  );
}
