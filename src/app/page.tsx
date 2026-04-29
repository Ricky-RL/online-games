import { NewGameButton } from '@/components/NewGameButton';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <main className="flex flex-col items-center gap-12 text-center">
        {/* Decorative circles */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-player1 opacity-60" />
          <div className="w-6 h-6 rounded-full bg-player2 opacity-60" />
          <div className="w-6 h-6 rounded-full bg-player1 opacity-60" />
          <div className="w-6 h-6 rounded-full bg-player2 opacity-60" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
            Connect Four
          </h1>
          <p className="text-lg text-text-secondary">
            A game for two
          </p>
        </div>

        {/* Action */}
        <NewGameButton />

        {/* Footer decoration */}
        <div className="flex items-center gap-2 mt-8">
          <div className="w-3 h-3 rounded-full bg-board opacity-20" />
          <div className="w-2 h-2 rounded-full bg-board opacity-10" />
          <div className="w-1.5 h-1.5 rounded-full bg-board opacity-5" />
        </div>
      </main>
    </div>
  );
}
