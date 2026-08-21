import Link from "next/link";

const NotFound = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-teal-500">Page not found</h1>
      <p className="max-w-md text-slate-600 dark:text-slate-300">
        The page you were looking for does not exist.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-teal-500 px-5 py-2 font-semibold text-white transition-colors hover:bg-teal-600"
      >
        Back to login
      </Link>
    </div>
  );
};

export default NotFound;
