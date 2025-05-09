import Link from "next/link";

interface GameCardProps {
  icon: React.ReactNode;
  title: string;
  link: string;
  description?: string; // Optional description for larger cards
}

// Game Card Component
export function GameCard({ icon, title, link, description }: GameCardProps) {
  return (
    <Link href={link} className="group">
      <div className="flex flex-col rounded-lg border border-border bg-card/40 p-6 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/50 group-hover:bg-card/70 transition-all duration-200 h-full transform group-hover:scale-[1.02]">
        <div className="flex justify-center items-center h-16 w-16 rounded-full bg-secondary/30 mb-4 mx-auto group-hover:bg-secondary/50 transition-colors">
          {icon}
        </div>

        <h3 className="text-xl font-bold text-center mb-2 group-hover:text-purple-500 transition-colors">{title}</h3>
        
        {description && (
          <p className="text-center text-muted-foreground mb-4 text-sm">{description}</p>
        )}

        <div className="mt-auto pt-4">
          <div className="w-full text-center rounded-md border border-border px-3 py-2 text-sm bg-secondary/40 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-colors">
            Play Now
          </div>
        </div>
      </div>
    </Link>
  )
}