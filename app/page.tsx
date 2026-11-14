export default function Home() {
  return <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-10 sm:px-12">
    <header className="text-xl font-bold tracking-tight">icebreak<span aria-hidden="true" className="text-teal-700"> ✳</span></header>
    <section className="my-auto grid gap-12 py-20 sm:grid-cols-2 sm:items-center">
      <div><p className="mb-4 text-sm font-bold uppercase tracking-widest text-teal-800">Same event. A new hello.</p>
      <h1 className="text-6xl leading-tight sm:text-7xl">Break the ice.<br />At your pace.</h1>
      <p className="mt-6 max-w-sm text-lg leading-relaxed">A little common ground for the people in the room. Start with your event code.</p></div>
      <form action="/join" method="get" className="rounded-3xl border border-sky-200 bg-white p-8 shadow-sm">
        <h2 className="mb-7 text-3xl">Join Event</h2>
        <label htmlFor="event-code" className="mb-2 block font-bold">Event code</label>
        <input id="event-code" name="code" required maxLength={16} autoComplete="off" placeholder="e.g. HELLO26" className="w-full rounded-lg border border-slate-400 px-4 py-3 uppercase tracking-widest" />
        <button className="mt-5 w-full rounded-lg bg-teal-800 px-4 py-3 font-bold text-white hover:bg-teal-900" type="submit">Join Event <span aria-hidden="true">→</span></button>
        <p className="mt-4 text-sm text-slate-600">You’ll find the code with your event host.</p>
      </form>
    </section>
    <footer className="text-sm text-slate-600">A first hello is enough.</footer>
  </main>;
}
