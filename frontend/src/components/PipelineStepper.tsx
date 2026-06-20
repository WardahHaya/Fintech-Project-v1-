import { Check, LoaderCircle } from 'lucide-react'
import { motion } from 'framer-motion'


export function PipelineStepper({
  title,
  stages,
  activeStage,
}: {
  title: string
  stages: string[]
  activeStage: number
}) {
  return (
    <div className="surface-card relative overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-light to-accent" />

      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate">Live pipeline</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-navy">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate">
          The review is progressing through the agent stages in sequence.
        </p>
      </div>

      <div className="space-y-0">
        {stages.map((stage, index) => {
          const isCompleted = index < activeStage
          const isActive = index === activeStage
          const isPending = index > activeStage

          return (
            <div key={stage} className="grid grid-cols-[2.5rem_1fr] gap-4">
              <div className="relative flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.06 : 1,
                    backgroundColor: isCompleted
                      ? '#FF6B47'
                      : isActive
                        ? '#635BFF'
                        : '#E5EAF3',
                    borderColor: isActive ? '#7E6BFD' : 'transparent',
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border text-white shadow-sm"
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0.65, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  ) : isActive ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-sm font-semibold text-slate">{index + 1}</span>
                  )}
                </motion.div>
                {index < stages.length - 1 ? (
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted ? '#FF6B47' : '#D9E1EC',
                      opacity: isPending ? 0.6 : 1,
                    }}
                    className="my-2 h-12 w-px"
                  />
                ) : null}
              </div>

              <motion.div
                initial={false}
                animate={{
                  opacity: isPending ? 0.5 : 1,
                  y: isActive ? -1 : 0,
                }}
                className="pb-7"
              >
                <p className="text-sm font-semibold text-navy">{stage}</p>
                <p className="mt-1 text-sm text-slate">
                  {isCompleted
                    ? 'Completed'
                    : isActive
                      ? 'In progress'
                      : 'Queued'}
                </p>
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
