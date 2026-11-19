import { Button, type ButtonProps } from './Button'

type SemanticProps = Omit<ButtonProps, 'variant'>

/** Main action on a screen. There should usually be one of these. */
export function PrimaryButton({ size = 'md', ...props }: SemanticProps) {
  return <Button {...props} variant="primary" size={size} />
}

/** Lower-emphasis action, such as "Choose a different hospital". */
export function SecondaryButton({ size = 'md', ...props }: SemanticProps) {
  return <Button {...props} variant="secondary" size={size} />
}

/** Reserved for urgent, user-initiated emergency actions. */
export function EmergencyButton({ size = 'lg', icon = 'medical', ...props }: SemanticProps) {
  return <Button {...props} variant="danger" size={size} icon={icon} />
}
