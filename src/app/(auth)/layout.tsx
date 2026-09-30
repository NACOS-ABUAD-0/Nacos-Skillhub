import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper">
      <aside className="relative hidden lg:flex flex-col justify-between bg-forest text-paper p-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(61,220,132,0.18),transparent_55%)] pointer-events-none" />
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <Image
            src="/images/nacoslogo.png"
            alt="NACOS"
            width={36}
            height={36}
            className="object-contain"
          />
          <span className="font-display font-semibold text-lg">
            NACOS Skills Hub
          </span>
        </Link>
        <div className="relative z-10 space-y-4 max-w-md">
          <p className="font-mono text-xs uppercase tracking-widest text-signal">
            Peer mentorship · ABUAD
          </p>
          <h1 className="font-display font-bold text-4xl leading-tight">
            Find the mentor who&apos;s already where you&apos;re going.
          </h1>
          <p className="text-paper/75 font-body leading-relaxed">
            Sign in with your email. Mentors are reviewed and approved by
            the NACOS academic committee.
          </p>
        </div>
        <p className="relative z-10 font-mono text-xs text-paper/50">
          NACOS ABUAD · Skills Hub
        </p>
      </aside>
      <main className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="lg:hidden mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/images/nacoslogo.png"
              alt="NACOS"
              width={28}
              height={28}
            />
            <span className="font-display font-semibold text-forest">
              NACOS Skills Hub
            </span>
          </Link>
        </div>
        <div className="w-full max-w-md mx-auto">{children}</div>
      </main>
    </div>
  );
}
