import { EmptyState, type EmptyStateProps } from './EmptyState'

export type ErrorStateProps = Omit<EmptyStateProps, 'title'> & {
  title?: string
}

/** Shared receive-failed state, including an optional recovery action. */
export function ErrorState({ title = 'Something went wrong', icon = 'alert-circle-outline', ...props }: ErrorStateProps) {
  return <EmptyState {...props} icon={icon} title={title} />
}
