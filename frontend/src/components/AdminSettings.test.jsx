import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import AdminSettings from './AdminSettings';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

describe('AdminSettings', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
  });

  it('renders theme toggle and saves professional-dark', async () => {
    api.get.mockResolvedValueOnce({ data: { site_theme: 'professional-light' } });
    api.put.mockResolvedValueOnce({ status: 200 });
    api.get.mockResolvedValueOnce({ data: { site_theme: 'professional-dark' } });

    render(<AdminSettings />);

    expect(await screen.findByText('Website Theme')).toBeInTheDocument();

    const toggle = screen.getByTestId('set-site-theme-toggle');
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggle);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/admin/settings', { site_theme: 'professional-dark' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('set-site-theme-toggle')).toHaveAttribute('aria-checked', 'true');
    });
  });
});
