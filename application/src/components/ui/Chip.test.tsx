import { render, screen } from '@testing-library/react-native';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders its label for each tone', () => {
    render(<Chip label="Easy" tone="correct" />);
    expect(screen.getByText('Easy')).toBeTruthy();
  });

  it('renders a neutral chip', () => {
    render(<Chip label="3 packs · 120 words" />);
    expect(screen.getByText('3 packs · 120 words')).toBeTruthy();
  });
});
