import { Link } from "react-router-dom";

const Error = () => {
  return (
    <section className="min-h-[calc(100vh-80px)] bg-[#0a0f1a] text-white flex items-center">
      <div className="w-full max-w-2xl mx-auto px-4 text-center py-12">
        <p className="text-yellow-400 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase mb-3">
          Error 404
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Page not found</h1>
        <p className="text-gray-400 text-base sm:text-lg mb-8">
          The page you are looking for does not exist or was moved.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold transition"
          >
            Back to Home
          </Link>
          <Link
            to="/leaderboard"
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 border border-white/20 text-white hover:bg-white/10 font-semibold transition"
          >
            View Leaderboard
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Error;
