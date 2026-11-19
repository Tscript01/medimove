import { TextField, type TextFieldProps } from './TextField'

/**
 * Semantic alias for the app's single text-input implementation. Keeping the
 * name available makes form intent explicit without creating a second input
 * system to maintain.
 */
export type AppInputProps = TextFieldProps

export function AppInput(props: AppInputProps) {
  return <TextField {...props} />
}
