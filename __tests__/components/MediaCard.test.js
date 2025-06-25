// __tests__/components/MediaCard.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MediaCard from '../../components/MediaCard'

// Mock next/router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('MediaCard Component', () => {
  const defaultProps = {
    title: 'The Matrix',
    year: 1999,
    initialSlug: 'Mind-bending sci-fi thriller',
    initialPoster: '/matrix.jpg',
    initialStreaming: 'Available on Netflix',
    tmdbId: 603
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        poster_url: '/enhanced-matrix.jpg',
        streaming_data: 'Available on Netflix, Prime Video'
      })
    })
  })

  it('renders movie information correctly', () => {
    render(<MediaCard {...defaultProps} />)
    
    expect(screen.getByText('The Matrix')).toBeInTheDocument()
    expect(screen.getByText('1999')).toBeInTheDocument()
    expect(screen.getByText('Mind-bending sci-fi thriller')).toBeInTheDocument()
  })

  it('displays initial poster image', () => {
    render(<MediaCard {...defaultProps} />)
    
    const posterImage = screen.getByRole('img')
    expect(posterImage).toHaveAttribute('src', '/matrix.jpg')
    expect(posterImage).toHaveAttribute('alt', 'The Matrix poster')
  })

  it('navigates to movie page when clicked', () => {
    render(<MediaCard {...defaultProps} />)
    
    const movieCard = screen.getByRole('article')
    fireEvent.click(movieCard)
    
    expect(mockPush).toHaveBeenCalledWith('/movie/603')
  })

  it('enhances movie data on mount', async () => {
    render(<MediaCard {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/enhance-movie-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: 603 })
      })
    })
  })

  it('updates poster after enhancement', async () => {
    render(<MediaCard {...defaultProps} />)
    
    await waitFor(() => {
      const posterImage = screen.getByRole('img')
      expect(posterImage).toHaveAttribute('src', '/enhanced-matrix.jpg')
    })
  })

  it('handles missing tmdbId gracefully', () => {
    const propsWithoutTmdbId = { ...defaultProps, tmdbId: undefined }
    render(<MediaCard {...propsWithoutTmdbId} />)
    
    expect(screen.getByText('The Matrix')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles enhancement API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    render(<MediaCard {...defaultProps} />)
    
    // Should still render the component with initial data
    expect(screen.getByText('The Matrix')).toBeInTheDocument()
    
    await waitFor(() => {
      const posterImage = screen.getByRole('img')
      expect(posterImage).toHaveAttribute('src', '/matrix.jpg') // Still shows initial poster
    })
  })

  it('applies correct CSS classes for styling', () => {
    render(<MediaCard {...defaultProps} />)
    
    const movieCard = screen.getByRole('article')
    expect(movieCard).toHaveStyle({
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      cursor: 'pointer'
    })
  })

  it('handles very long titles gracefully', () => {
    const longTitleProps = {
      ...defaultProps,
      title: 'This is a Very Long Movie Title That Should Be Handled Gracefully Without Breaking the Layout'
    }
    
    render(<MediaCard {...longTitleProps} />)
    
    expect(screen.getByText(longTitleProps.title)).toBeInTheDocument()
  })

  it('handles missing poster gracefully', () => {
    const noPosterProps = {
      ...defaultProps,
      initialPoster: null
    }
    
    render(<MediaCard {...noPosterProps} />)
    
    const posterImage = screen.getByRole('img')
    expect(posterImage).toHaveAttribute('src', '/images/placeholder-poster.jpg')
  })
})