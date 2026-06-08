import { render, screen } from '@testing-library/react-native';
import { WordCard } from './WordCard';

describe('WordCard', () => {
  it('renders the word', () => {
    render(<WordCard word="apple" />);
    expect(screen.getByText('apple')).toBeTruthy();
  });

  it('renders the taboo list with its label', () => {
    render(<WordCard word="sun" taboo={['star', 'hot']} />);
    expect(screen.getByText("DON'T SAY")).toBeTruthy();
    expect(screen.getByText('star')).toBeTruthy();
    expect(screen.getByText('hot')).toBeTruthy();
  });
});
