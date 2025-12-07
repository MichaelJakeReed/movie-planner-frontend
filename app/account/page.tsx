"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

type Movie = {
  id: string;
  title: string;
  status: "PLAN_TO_WATCH" | "HAVE_WATCHED" | string;
  review?: string | null;
  rating?: number | null;
  imageUrl?: string | null;
};

type Filter = "ALL" | "PLAN_TO_WATCH" | "HAVE_WATCHED";

function renderStars(rating?: number | null) {
  if (!rating || rating < 1) return "";
  const full = "★".repeat(Math.min(5, rating));
  const empty = "☆".repeat(5 - Math.min(5, rating));
  return full + empty;
}

export default function AccountPage() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [moviesError, setMoviesError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  // Add/edit form fields
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"PLAN_TO_WATCH" | "HAVE_WATCHED">(
    "PLAN_TO_WATCH"
  );
  const [review, setReview] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [posterUrl, setPosterUrl] = useState("");

  // search
  const [searchQuery, setSearchQuery] = useState("");

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

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("mp_sessionToken");
      window.localStorage.removeItem("mp_username");
    }
    router.push("/");
  }

  async function fetchMovies() {
    if (!sessionToken) return;
    try {
      setLoadingMovies(true);
      setMoviesError(null);

      const res = await fetch(`${API_BASE_URL}/movies`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: Movie[] = await res.json();
      setMovies(data);
    } catch (err: any) {
      console.error(err);
      setMoviesError(err.message ?? "Failed to load movies");
    } finally {
      setLoadingMovies(false);
    }
  }

  useEffect(() => {
    if (sessionToken) {
      fetchMovies();
    }
  }, [sessionToken]);

  async function handleAddMovie(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken) {
      setMoviesError("Please log in first.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    const payload: any = {
      title: title.trim(),
      status,
      imageUrl: posterUrl.trim() || null
    };

    if (status === "HAVE_WATCHED") {
      if (!rating) {
        alert("Please select a rating 1–5 for watched movies.");
        return;
      }
      payload.rating = rating;
      payload.review = review.trim() || null;
    }

    try {
      setMoviesError(null);
      const res = await fetch(`${API_BASE_URL}/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setTitle("");
      setStatus("PLAN_TO_WATCH");
      setRating(null);
      setReview("");
      setPosterUrl("");

      await fetchMovies();
    } catch (err: any) {
      console.error(err);
      setMoviesError(err.message ?? "Failed to add movie");
    }
  }

  async function updateMovieStatus(
    id: string,
    newStatus: "PLAN_TO_WATCH" | "HAVE_WATCHED"
  ) {
    if (!sessionToken) {
      setMoviesError("Please log in first.");
      return;
    }

    try {
      setMoviesError(null);
      const res = await fetch(
        `${API_BASE_URL}/movies?id=${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchMovies();
    } catch (err: any) {
      console.error(err);
      setMoviesError(err.message ?? "Failed to update movie");
    }
  }

  async function markWatched(movie: Movie) {
    if (!sessionToken) {
      setMoviesError("Please log in first.");
      return;
    }

    try {
      setMoviesError(null);

      let ratingValue: number | null = movie.rating ?? null;
      let reviewText: string = movie.review ?? "";

      const ratingInput = window.prompt(
        `How would you rate "${movie.title}" (1–5)? Leave blank to skip.`,
        ratingValue ? String(ratingValue) : ""
      );

      if (ratingInput !== null && ratingInput.trim() !== "") {
        const parsed = Number(ratingInput.trim());
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
          ratingValue = parsed;
        } else {
          alert("Invalid rating, must be 1–5.");
        }
      }

      const reviewInput = window.prompt(
        `Leave a short review for "${movie.title}" (optional):`,
        reviewText
      );
      if (reviewInput !== null) {
        reviewText = reviewInput;
      }

      const body: any = {
        status: "HAVE_WATCHED" as const,
        rating: ratingValue,
        review: reviewText.trim() || null
        // keep existing imageUrl as-is in DB
      };

      const res = await fetch(
        `${API_BASE_URL}/movies?id=${encodeURIComponent(movie.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`
          },
          body: JSON.stringify(body)
        }
      );

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchMovies();
    } catch (err: any) {
      console.error(err);
      setMoviesError(err.message ?? "Failed to mark movie as watched");
    }
  }

  async function deleteMovie(id: string) {
    if (!sessionToken) {
      setMoviesError("Please log in first.");
      return;
    }

    if (!confirm("Delete this movie?")) return;
    try {
      setMoviesError(null);
      const res = await fetch(
        `${API_BASE_URL}/movies?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${sessionToken}`
          }
        }
      );

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok && res.status !== 204) {
        throw new Error(`HTTP ${res.status}`);
      }
      await fetchMovies();
    } catch (err: any) {
      console.error(err);
      setMoviesError(err.message ?? "Failed to delete movie");
    }
  }

  // status + search filtering
  const statusFiltered =
    filter === "ALL"
      ? movies
      : movies.filter((m) => m.status === filter);

  const filteredMovies = statusFiltered.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const inTitle = m.title.toLowerCase().includes(q);
    const inStatus = m.status.toLowerCase().includes(q);
    const inReview = (m.review ?? "").toLowerCase().includes(q);

    return inTitle || inStatus || inReview;
  });

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
              className="rounded px-2 py-1 hover:bg-[#1f1f1f]"
            >
              Discover
            </button>
            <button
              onClick={() => router.push("/account")}
              className="rounded px-2 py-1 bg-[#1f1f1f] border border-[#333]"
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

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              My movies
            </h1>
            <p className="mt-2 max-w-xl text-sm text-gray-300">
              View and manage movies you&apos;ve added from Discover or
              directly on this page. You can track what you want to watch
              and what you&apos;ve already seen.
            </p>
          </div>
          <div className="flex gap-2 text-xs text-gray-400">
            <div className="rounded border border-[#333] bg-[#151515] px-3 py-2">
              <div className="font-semibold text-gray-200">Movies</div>
              <div>
                {loadingMovies
                  ? "Loading..."
                  : `${movies.length} for this user`}
              </div>
            </div>
          </div>
        </section>

        {moviesError && (
          <div className="mb-4 rounded border border-red-500 bg-red-900/20 px-3 py-2 text-sm text-red-200">
            {moviesError}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Add movie panel */}
          <section className="rounded-2xl border border-[#2f2f2f] bg-[#151515] p-4 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-white mb-3">
              Add a movie manually
            </h2>
            {!currentUser ? (
              <p className="text-xs text-gray-400">
                Log in to add movies.
              </p>
            ) : (
              <form className="space-y-3" onSubmit={handleAddMovie}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Title
                  </label>
                  <input
                    className="mt-1 w-full rounded bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none ring-[#f5c518]/40 placeholder:text-gray-500 focus:ring-2"
                    placeholder="Movie title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Poster URL (optional)
                  </label>
                  <input
                    className="mt-1 w-full rounded bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none ring-[#f5c518]/40 placeholder:text-gray-500 focus:ring-2"
                    placeholder="https://example.com/poster.jpg"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Status
                  </label>
                  <select
                    className="mt-1 w-full rounded bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none ring-[#f5c518]/40 focus:ring-2"
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as "PLAN_TO_WATCH" | "HAVE_WATCHED"
                      )
                    }
                  >
                    <option value="PLAN_TO_WATCH">Plan to Watch</option>
                    <option value="HAVE_WATCHED">Have Watched</option>
                  </select>
                </div>

                {status === "HAVE_WATCHED" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Rating
                      </label>
                      <select
                        className="mt-1 w-full rounded bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none ring-[#f5c518]/40 focus:ring-2"
                        value={rating ?? ""}
                        onChange={(e) =>
                          setRating(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      >
                        <option value="">Select rating</option>
                        {[1, 2, 3, 4, 5].map((r) => (
                          <option key={r} value={r}>
                            {r} / 5
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Review
                      </label>
                      <textarea
                        className="mt-1 w-full rounded bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none ring-[#f5c518]/40 placeholder:text-gray-500 focus:ring-2"
                        rows={3}
                        placeholder="What did you think?"
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="mt-2 inline-flex w-full items-center justify-center rounded bg-[#f5c518] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#e0b214]"
                >
                  Add to list
                </button>
              </form>
            )}
          </section>

          {/* Movies list */}
          <section>
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">
                  Your movies
                </h2>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setFilter("ALL")}
                    className={`rounded-full px-3 py-1 ${
                      filter === "ALL"
                        ? "bg-[#f5c518] text-black"
                        : "bg-[#1f1f1f] text-gray-300"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter("PLAN_TO_WATCH")}
                    className={`rounded-full px-3 py-1 ${
                      filter === "PLAN_TO_WATCH"
                        ? "bg-[#f5c518] text-black"
                        : "bg-[#1f1f1f] text-gray-300"
                    }`}
                  >
                    Plan to Watch
                  </button>
                  <button
                    onClick={() => setFilter("HAVE_WATCHED")}
                    className={`rounded-full px-3 py-1 ${
                      filter === "HAVE_WATCHED"
                        ? "bg-[#f5c518] text-black"
                        : "bg-[#1f1f1f] text-gray-300"
                    }`}
                  >
                    Have Watched
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your movies by title, status, or review text"
                  className="w-full rounded-md border border-[#333] bg-[#121212] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
                />
                {searchQuery.trim() && (
                  <p className="mt-1 text-xs text-gray-400">
                    Showing results for{" "}
                    <span className="font-semibold">
                      "{searchQuery}"
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
              <span>
                Showing {filteredMovies.length} of {movies.length} movies
              </span>
              <button
                onClick={fetchMovies}
                disabled={!sessionToken}
                className="rounded border border-[#333] bg-[#151515] px-2 py-1 hover:border-[#555] disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {!currentUser ? (
              <div className="rounded border border-dashed border-[#333] bg-[#151515] px-4 py-6 text-center text-sm text-gray-400">
                Log in to see your movies.
              </div>
            ) : (
              <div className="space-y-3">
                {loadingMovies && (
                  <div className="text-sm text-gray-400">Loading…</div>
                )}
                {!loadingMovies && filteredMovies.length === 0 && (
                  <div className="rounded border border-dashed border-[#333] bg-[#151515] px-4 py-6 text-center text-sm text-gray-400">
                    No movies in this view yet. Add one on the left or from
                    Discover.
                  </div>
                )}
                {filteredMovies.map((movie) => (
                  <article
                    key={movie.id}
                    className="flex gap-3 rounded-2xl border border-[#2f2f2f] bg-[#151515] p-3 shadow-md shadow-black/30"
                  >
                    {/* Poster */}
                    <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-gradient-to-b from-[#333] to-[#111]">
                      {movie.imageUrl ? (
                        <img
                          src={movie.imageUrl}
                          alt={movie.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {movie.title}
                        </h3>

                        {movie.status === "HAVE_WATCHED" ? (
                          <>
                            <div className="mt-1 text-sm text-yellow-300">
                              {renderStars(movie.rating ?? null)}{" "}
                              <span className="text-xs text-gray-400">
                                {movie.rating
                                  ? `${movie.rating}/5`
                                  : "Not rated"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-300">
                              {movie.review || "No written review yet."}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-gray-400">
                            Planned watch. No review yet.
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                            movie.status === "HAVE_WATCHED"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {movie.status === "HAVE_WATCHED"
                            ? "Have Watched"
                            : "Plan to Watch"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-xs">
                      <button
                        onClick={() => markWatched(movie)}
                        className="rounded bg-[#1f1f1f] px-2 py-1 text-green-300 hover:bg-[#252525]"
                      >
                        Mark watched and review
                      </button>
                      <button
                        onClick={() =>
                          updateMovieStatus(movie.id, "PLAN_TO_WATCH")
                        }
                        className="rounded bg-[#1f1f1f] px-2 py-1 text-blue-300 hover:bg-[#252525]"
                      >
                        Mark plan to watch
                      </button>
                      <button
                        onClick={() => deleteMovie(movie.id)}
                        className="rounded bg-[#311111] px-2 py-1 text-red-300 hover:bg-[#3b1515]"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}



