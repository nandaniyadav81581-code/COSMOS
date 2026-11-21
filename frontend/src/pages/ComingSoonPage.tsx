import { Link } from "react-router-dom";
import { GlassCard } from "../components/ui";

/** Placeholder for sections you build in later lessons. */
export function ComingSoonPage({ title, lesson }: { title: string; lesson: string }) {
  return (
    <div className="container-cosmos py-20">
      <GlassCard className="mx-auto max-w-xl p-10 text-center">
        <p className="eyebrow">{lesson}</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-navy-500">
          This part of the observatory is still being charted.
        </p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-violet-500 px-5 py-2 text-white hover:bg-violet-600">
          Back to Explore
        </Link>
      </GlassCard>
    </div>
  );
}