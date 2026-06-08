import { render } from '@testing-library/react-native';
import i18n from '@/i18n';
import { Confetti } from '../components/Confetti';
import { buildShareMessage } from './Winner';

describe('buildShareMessage', () => {
  it('includes the champion, the scoreboard, and rounds played', () => {
    const msg = buildShareMessage(
      'Red',
      [
        { name: 'Red', score: 12 },
        { name: 'Blue', score: 9 },
      ],
      3,
      i18n.t,
    );
    expect(msg).toContain('Red won');
    expect(msg).toContain('Red: 12');
    expect(msg).toContain('Blue: 9');
    expect(msg).toContain('3 rounds played');
  });

  it('uses a generic headline when there is no champion', () => {
    expect(buildShareMessage(undefined, [{ name: 'Red', score: 5 }], 1, i18n.t)).toContain('Alias');
  });
});

describe('Confetti', () => {
  it('renders without crashing', () => {
    expect(render(<Confetti />).toJSON()).toBeTruthy();
  });
});
