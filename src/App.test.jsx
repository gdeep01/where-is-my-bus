import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders landing page', () => {
  render(<App />)
  expect(screen.getByText(/Where is My Bus/i)).toBeDefined()
})
