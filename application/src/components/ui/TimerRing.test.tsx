import { render, screen } from '@testing-library/react-native';
import { TimerRing } from './TimerRing';

describe('TimerRing', () => {
  it('renders the remaining whole seconds', () => {
    render(<TimerRing remainingSec={42} totalSec={60} />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('exposes an accessible remaining-time label', () => {
    render(<TimerRing remainingSec={9} totalSec={60} />);
    expect(screen.getByLabelText('9 seconds remaining')).toBeTruthy();
  });
});
