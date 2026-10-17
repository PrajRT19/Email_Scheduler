import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, StatusBadge, Avatar, EmptyState } from '../components/ui';

describe('UI Primitives (Phase F2)', () => {
  it('renders button with text and handles loading state', () => {
    const { rerender } = render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();

    rerender(<Button loading>Click Me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders StatusBadge for different email statuses', () => {
    const { rerender } = render(<StatusBadge status="scheduled" />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();

    rerender(<StatusBadge status="sent" />);
    expect(screen.getByText('Sent')).toBeInTheDocument();

    rerender(<StatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();

    rerender(<StatusBadge status="processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders Avatar with user initials when avatarUrl is null', () => {
    render(<Avatar name="Oliver Brown" avatarUrl={null} size={32} />);
    expect(screen.getByText('OB')).toBeInTheDocument();
  });

  it('renders Avatar image when avatarUrl is provided', () => {
    render(<Avatar name="Oliver Brown" avatarUrl="https://example.com/avatar.jpg" size={32} />);
    const img = screen.getByRole('img', { name: 'Oliver Brown' });
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders EmptyState with title and description', () => {
    render(
      <EmptyState
        title="No emails found"
        description="Try adjusting your search criteria"
        action={<Button>Create Email</Button>}
      />
    );
    expect(screen.getByText('No emails found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create email/i })).toBeInTheDocument();
  });
});
