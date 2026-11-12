import Link from "next/link";

export function SiteFooter({
  stadiumName,
  tagline,
  address,
  phone,
  email,
  hoursNote,
}: {
  stadiumName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  hoursNote: string;
}) {
  return (
    <footer className="mt-16 border-t border-[#1b365d] bg-[var(--navy-950)] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-white">{stadiumName}</p>
          <p className="mt-2 text-sm text-slate-300">{tagline}</p>
          <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
            {hoursNote}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#a3e635]">Facilities</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/facilities/badminton" className="hover:text-white">Badminton (4 Courts)</Link></li>
            <li><Link href="/facilities/gym" className="hover:text-white">Conditioning Gym</Link></li>
            <li><Link href="/facilities/table-tennis" className="hover:text-white">Table Tennis (2 Tables)</Link></li>
            <li><Link href="/facilities/yoga" className="hover:text-white">Morning Yoga</Link></li>
            <li><Link href="/facilities/basketball" className="hover:text-white">Basketball Shared-Floor</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#a3e635]">Community</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/membership" className="hover:text-white">Membership Plans</Link></li>
            <li><Link href="/portal/games" className="hover:text-white">Badminton Matchmaking</Link></li>
            <li><Link href="/portal/find-players" className="hover:text-white">Find Players</Link></li>
            <li><Link href="/about" className="hover:text-white">About the Stadium</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#a3e635]">Stadium Desk</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase text-slate-400">Address</dt>
              <dd className="text-slate-200">{address}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Phone</dt>
              <dd className="text-slate-200">{phone}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Email</dt>
              <dd className="text-slate-200">{email}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-400">
        {stadiumName} — All facilities included with active membership. Physical badminton courts operate first-come-first-served.
      </div>
    </footer>
  );
}
