"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

type DiscoverMovie = {
  id: string;
  title: string;
  year: number;
  genres: string[];
  description: string;
  imageUrl: string;
};

type RatingSummary = {
  title: string;
  averageRating: number; // e.g. 4.3
  roundedRating: number; // e.g. 4
  ratingCount: number;
};

const DISCOVER_MOVIES: DiscoverMovie[] = [
  {
    id: "disc-1",
    title: "Inception",
    year: 2010,
    genres: ["Sci-Fi", "Thriller"],
    description:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given a chance at redemption.",
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmaTHAbTa2MTEGM_PwqBU61jEzjEcQfx-Zb39fyctMdZheq2Uj"
  },
  {
    id: "disc-2",
    title: "The Dark Knight",
    year: 2008,
    genres: ["Action", "Crime"],
    description:
      "Batman faces the Joker, a criminal mastermind who plunges Gotham into chaos.",
    imageUrl:
      "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcR2Cghv6inVgiEL-vAYFJg8Rff175LiNaWKzV4tytSLG6D0c2n_"
  },
  {
    id: "disc-3",
    title: "La La Land",
    year: 2016,
    genres: ["Romance", "Drama", "Musical"],
    description:
      "A jazz musician and an aspiring actress try to make it in Los Angeles while navigating love and ambition.",
    imageUrl:
      "https://theposterdepot.com/cdn/shop/products/lala-land-poster-1120201602_d2a246ae-5c6e-44ca-8904-ba83fce4fe20_1024x1024@2x.jpg?v=1549386938"
  },
  {
    id: "disc-4",
    title: "Spirited Away",
    year: 2001,
    genres: ["Animation", "Fantasy"],
    description:
      "A young girl enters a world of spirits and must save her parents and find her way back.",
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlyek7tCF3dXq_2y6E5NGajum2a_s8clAIu6WrdOxsO_Drmi04"
  }
];

function renderStars(roundedRating: number) {
  const r = Math.max(1, Math.min(5, roundedRating));
  const full = "★".repeat(r);
  const empty = "☆".repeat(5 - r);
  return full + empty;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [ratings, setRatings] = useState<RatingSummary[]>([]);

  // Auth guard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("mp_sessionToken");
    const user = window.localStorage.getItem("mp_username");
    if (!token || !user) {
      router.replace("/");
      return;
    }
    setSessionToken(token);
    setCurrentUser(user);
  }, [router]);

  // Fetch global ratings from /ratings (no auth needed)
  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/ratings`);
        if (!res.ok) return;
        const data: RatingSummary[] = await res.json();
        setRatings(data);
      } catch (err) {
        console.error("Error fetching ratings", err);
      }
    };
    fetchRatings();
  }, []);

  function getGlobalSummary(title: string): RatingSummary | null {
    const match = ratings.find((r) => r.title === title);
    if (!match || match.ratingCount === 0) return null;
    return match;
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("mp_sessionToken");
      window.localStorage.removeItem("mp_username");
    }
    router.push("/");
  }

  async function addToList(movie: DiscoverMovie) {
    if (!sessionToken) {
      setError("Please log in again.");
      router.replace("/");
      return;
    }
    try {
      setError(null);
      setBusyId(movie.id);
      const res = await fetch(`${API_BASE_URL}/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          title: movie.title,
          status: "PLAN_TO_WATCH"
        })
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to add movie");
    } finally {
      setBusyId(null);
    }
  }

  async function markWatched(movie: DiscoverMovie) {
    if (!sessionToken) {
      setError("Please log in again.");
      router.replace("/");
      return;
    }
    try {
      setError(null);

      let ratingValue: number | null = null;
      let reviewText = "";

      const ratingInput = window.prompt(
        `Rate "${movie.title}" (1–5):`,
        ""
      );
      if (ratingInput !== null && ratingInput.trim() !== "") {
        const parsed = Number(ratingInput.trim());
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
          ratingValue = parsed;
        } else {
          alert("Invalid rating, must be 1–5. Saving with no rating.");
        }
      }

      const reviewInput = window.prompt(
        `Leave a short review for "${movie.title}" (optional):`,
        ""
      );
      if (reviewInput !== null) {
        reviewText = reviewInput;
      }

      setBusyId(movie.id);

      const res = await fetch(`${API_BASE_URL}/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          title: movie.title,
          status: "HAVE_WATCHED",
          rating: ratingValue,
          review: reviewText.trim() || null
        })
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to add watched movie");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-gray-100">
      {/* Top nav */}
      <header className="bg-[#121212] border-b border-[#2f2f2f]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded bg-[#f5c518] px-2 py-1 text-xl font-bold text-black">
              MP
            </div>
            <span className="text-lg font-semibold tracking-wide">
              Movie Planner
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-300">
            <button
              onClick={() => router.push("/discover")}
              className="rounded px-2 py-1 bg-[#1f1f1f] border border-[#333]"
            >
              Discover
            </button>
            <button
              onClick={() => router.push("/account")}
              className="rounded px-2 py-1 hover:bg-[#1f1f1f]"
            >
              My Account
            </button>
            <span className="px-2 py-1 rounded bg-[#1f1f1f] border border-[#333]">
              {currentUser ? `Logged in as ${currentUser}` : "Loading..."}
            </span>
            <button
              onClick={handleLogout}
              className="rounded bg-[#1f1f1f] px-2 py-1 hover:bg-[#252525]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">
            Discover movies
          </h1>
          <p className="text-sm text-gray-300">
            Browse a curated list of movies and add them to your personal
            watchlist or mark them as watched with a review.
          </p>
        </section>

        {error && (
          <div className="mb-4 rounded border border-red-500 bg-red-900/20 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          {DISCOVER_MOVIES.map((movie) => {
            const global = getGlobalSummary(movie.title);

            return (
              <article
                key={movie.id}
                className="flex gap-3 rounded-2xl border border-[#2f2f2f] bg-[#151515] p-3 shadow-md shadow-black/30"
              >
                <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded bg-[#111]">
                  <img
                    src={movie.imageUrl}
                    alt={movie.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {movie.title}{" "}
                      <span className="text-xs text-gray-400">
                        ({movie.year})
                      </span>
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                      {movie.genres.join(" • ")}
                    </p>
                    <p className="mt-2 text-xs text-gray-300">
                      {movie.description}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex gap-2">
                      <button
                        disabled={!sessionToken || busyId === movie.id}
                        onClick={() => addToList(movie)}
                        className="rounded bg-[#1f1f1f] px-3 py-1 text-blue-300 hover:bg-[#252525] disabled:opacity-50"
                      >
                        {busyId === movie.id
                          ? "Adding..."
                          : "Add to My List"}
                      </button>
                      <button
                        disabled={!sessionToken || busyId === movie.id}
                        onClick={() => markWatched(movie)}
                        className="rounded bg-[#1f1f1f] px-3 py-1 text-green-300 hover:bg-[#252525] disabled:opacity-50"
                      >
                        {busyId === movie.id
                          ? "Saving..."
                          : "Mark Watched & Review"}
                      </button>
                    </div>

                    {global && (
                      <span className="ml-1 flex items-center gap-1 text-yellow-300">
                        <span className="font-mono">
                          {renderStars(global.roundedRating)}
                        </span>
                        <span className="text-[10px] text-gray-300">
                          {global.averageRating.toFixed(1)}/5 from{" "}
                          {global.ratingCount} rating
                          {global.ratingCount === 1 ? "" : "s"} (global)
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}



