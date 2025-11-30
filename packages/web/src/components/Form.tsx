/**
 * Reusable Form Components with React Hook Form
 * Type-safe form handling with Zod validation
 */

import React from 'react'
import { useForm, UseFormReturn, FieldValues, Path, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ============================================
// Form Context
// ============================================

interface FormProps<T extends FieldValues> {
  schema: z.ZodSchema<T>
  onSubmit: SubmitHandler<T>
  defaultValues?: Partial<T>
  children: (methods: UseFormReturn<T>) => React.ReactNode
  className?: string
}

export function Form<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className = '',
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as T,
  })

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
      {children(methods)}
    </form>
  )
}

// ============================================
// Form Field Component
// ============================================

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea'
  placeholder?: string
  methods: UseFormReturn<T>
  className?: string
  rows?: number
}

export function FormField<T extends FieldValues>({
  name,
  label,
  type = 'text',
  placeholder,
  methods,
  className = '',
  rows = 3,
}: FormFieldProps<T>) {
  const { register, formState: { errors } } = methods
  const error = errors[name]

  const inputClasses = `form-input ${error ? 'form-input-error' : ''} ${className}`

  return (
    <div className="form-field">
      <label htmlFor={name} className="form-label">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          placeholder={placeholder}
          rows={rows}
          className={inputClasses}
          {...register(name)}
        />
      ) : (
        <input
          id={name}
          type={type}
          placeholder={placeholder}
          className={inputClasses}
          {...register(name)}
        />
      )}
      {error && (
        <span className="form-error">
          {error.message as string}
        </span>
      )}
    </div>
  )
}

// ============================================
// Submit Button Component
// ============================================

interface SubmitButtonProps {
  children: React.ReactNode
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export function SubmitButton({
  children,
  isLoading = false,
  disabled = false,
  className = '',
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={`form-submit ${className}`}
    >
      {isLoading ? (
        <span className="form-loading">Loading...</span>
      ) : (
        children
      )}
    </button>
  )
}

// ============================================
// Form Error Message Component
// ============================================

interface FormErrorProps {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null

  return (
    <div className="form-error-message">
      {message}
    </div>
  )
}

// ============================================
// CSS Styles (can be moved to CSS file)
// ============================================

export const formStyles = `
.form-field {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--gray-300);
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--secondary);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.form-input-error {
  border-color: #ef4444;
}

.form-error {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #ef4444;
}

.form-submit {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: var(--secondary);
  color: var(--primary);
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.form-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.form-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-loading {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.form-error-message {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  color: #dc2626;
  font-size: 0.875rem;
}
`

export default Form
