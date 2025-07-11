// Component tests for DocumentCartIcon
import { render, screen, fireEvent, waitFor } from '../../tests/utils/test-utils'
import DocumentCartIcon from '../../components/DocumentCartIcon'
import '@testing-library/jest-dom'

// Mock the document cart hook
const mockAddToCart = jest.fn()
const mockCartItems = [
  {
    id: 'doc-1',
    company_id: 'company-1',
    type_document: 'PDF BODACC',
    source: 'BODACC',
    description: 'Test Document',
    lien_document: '/uploads/test.pdf',
    date_publication: '2023-01-01',
  }
]

jest.mock('../../hooks/useDocumentCart', () => ({
  useDocumentCart: () => ({
    cartItems: mockCartItems,
    cartCount: mockCartItems.length,
    isOpen: false,
    addToCart: mockAddToCart,
    removeFromCart: jest.fn(),
    clearCart: jest.fn(),
    isInCart: jest.fn(),
    toggleCart: jest.fn(),
    setIsOpen: jest.fn(),
    uploadProgress: {},
    updateUploadProgress: jest.fn()
  }),
}))

describe('DocumentCartIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders cart icon with item count', () => {
    render(<DocumentCartIcon />)
    
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // Badge count
  })

  it('shows tooltip on hover for floating variant', async () => {
    render(<DocumentCartIcon floating={true} />)
    
    const cartButton = screen.getByRole('button')
    fireEvent.mouseEnter(cartButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Panier: 1 document/)).toBeInTheDocument()
    })
  })

  it('shows correct pluralization for multiple items', () => {
    // Mock hook with updated module mock syntax
    const mockHook = require('../../hooks/useDocumentCart').useDocumentCart
    mockHook.mockReturnValue({
      cartItems: [{...mockCartItems[0]}, {...mockCartItems[0], id: 'doc-2'}],
      cartCount: 2,
      isOpen: false,
      addToCart: mockAddToCart,
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      isInCart: jest.fn(),
      toggleCart: jest.fn(),
      setIsOpen: jest.fn(),
      uploadProgress: {},
      updateUploadProgress: jest.fn()
    })

    render(<DocumentCartIcon />)
    
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows empty state when no items', () => {
    const mockHook = require('../../hooks/useDocumentCart').useDocumentCart
    mockHook.mockReturnValue({
      cartItems: [],
      cartCount: 0,
      isOpen: false,
      addToCart: mockAddToCart,
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      isInCart: jest.fn(),
      toggleCart: jest.fn(),
      setIsOpen: jest.fn(),
      uploadProgress: {},
      updateUploadProgress: jest.fn()
    })

    render(<DocumentCartIcon />)
    
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument() // No badge when empty
  })

  it('has proper accessibility attributes', () => {
    render(<DocumentCartIcon />)
    
    const cartButton = screen.getByRole('button')
    expect(cartButton).toHaveAttribute('title', 'Panier de documents')
  })

  it('triggers toggleCart when clicked', () => {
    const mockToggleCart = jest.fn()
    const mockHook = require('../../hooks/useDocumentCart').useDocumentCart
    mockHook.mockReturnValue({
      cartItems: mockCartItems,
      cartCount: mockCartItems.length,
      isOpen: false,
      addToCart: mockAddToCart,
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      isInCart: jest.fn(),
      toggleCart: mockToggleCart,
      setIsOpen: jest.fn(),
      uploadProgress: {},
      updateUploadProgress: jest.fn()
    })
    
    render(<DocumentCartIcon />)
    
    const cartButton = screen.getByRole('button')
    fireEvent.click(cartButton)
    
    expect(mockToggleCart).toHaveBeenCalledTimes(1)
  })

  it('applies custom className when provided', () => {
    render(<DocumentCartIcon customClass="custom-class" />)
    
    const cartButton = screen.getByRole('button')
    expect(cartButton).toHaveClass('custom-class')
  })

  it('handles keyboard navigation', () => {
    render(<DocumentCartIcon />)
    
    const cartButton = screen.getByRole('button')
    
    // Focus the button first
    cartButton.focus()
    expect(cartButton).toHaveFocus()
  })

  it('updates when cart items change', () => {
    const { rerender } = render(<DocumentCartIcon />)
    
    expect(screen.getByText('1')).toBeInTheDocument()
    
    // Mock updated cart state
    const mockHook = require('../../hooks/useDocumentCart').useDocumentCart
    mockHook.mockReturnValue({
      cartItems: [],
      cartCount: 0,
      isOpen: false,
      addToCart: mockAddToCart,
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      isInCart: jest.fn(),
      toggleCart: jest.fn(),
      setIsOpen: jest.fn(),
      uploadProgress: {},
      updateUploadProgress: jest.fn()
    })
    
    rerender(<DocumentCartIcon />)
    
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })
})