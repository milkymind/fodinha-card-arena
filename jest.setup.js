import '@testing-library/jest-dom'

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'success', game_state: {} }),
  })
)

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Socket.IO client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  }
  return {
    io: jest.fn(() => mockSocket),
    __esModule: true,
    default: jest.fn(() => mockSocket),
  }
})

// Mock window.localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
}) 