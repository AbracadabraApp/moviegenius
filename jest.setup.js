// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => null
  DynamicComponent.displayName = 'LoadableComponent'
  DynamicComponent.preload = jest.fn()
  return DynamicComponent
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock fetch globally
global.fetch = jest.fn()

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }

  observe() {
    return null
  }

  disconnect() {
    return null
  }

  unobserve() {
    return null
  }
}

// Setup cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})