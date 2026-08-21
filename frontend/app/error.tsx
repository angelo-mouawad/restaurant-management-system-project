"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ErrorBoundary = ({ error, reset }: Props) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-teal-500">Something went wrong</h1>
      <p className="max-w-md text-slate-600 dark:text-slate-300">
        The page could not be displayed. You can try again, and if the problem keeps happening make
        sure the API is running.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-teal-500 px-5 py-2 font-semibold text-white transition-colors hover:bg-teal-600"
      >
        Try again
      </button>
    </div>
  );
};

export default ErrorBoundary;
