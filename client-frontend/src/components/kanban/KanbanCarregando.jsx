import { Skeleton } from '../ui';

/** Esqueleto do quadro enquanto as vagas e o funil carregam. */
export default function KanbanCarregando() {
  return (
    <div className="h-full overflow-x-auto pb-6" aria-busy="true">
      <div className="flex h-full min-w-max gap-5 items-start">
        {[1, 2, 3, 4].map((coluna) => (
          <div key={coluna} className="flex w-[300px] flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {[1, 2, 3].map((card) => (
              <div key={card} className="rounded-xl bg-surface border border-divider p-3.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-28 mb-1.5" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
