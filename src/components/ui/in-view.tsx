import * as React from "react"
import { motion, type HTMLMotionProps, type Variants } from "motion/react"

type InViewProps = HTMLMotionProps<"div"> & {
  variants?: Variants
  viewOptions?: {
    once?: boolean
    margin?: string
    amount?: "some" | "all" | number
  }
}

const InView = React.forwardRef<HTMLDivElement, InViewProps>(
  (
    {
      children,
      variants,
      viewOptions,
      initial = "hidden",
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        initial={initial}
        whileInView="visible"
        viewport={{
          once: viewOptions?.once ?? true,
          margin: viewOptions?.margin ?? "0px 0px -100px 0px",
          amount: viewOptions?.amount ?? "some",
        }}
        variants={
          variants ?? {
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }
        }
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

InView.displayName = "InView"

export { InView }