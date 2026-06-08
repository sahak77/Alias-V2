import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionButtonBar } from './ActionButtonBar';

describe('ActionButtonBar', () => {
  it('fires Correct and Skip, and hides Foul when no onFoul is given', () => {
    const onCorrect = jest.fn();
    const onSkip = jest.fn();
    render(<ActionButtonBar onCorrect={onCorrect} onSkip={onSkip} />);

    expect(screen.queryByLabelText('Foul')).toBeNull();
    fireEvent.press(screen.getByLabelText('Correct'));
    fireEvent.press(screen.getByLabelText('Skip'));
    expect(onCorrect).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows Foul when onFoul is provided', () => {
    const onFoul = jest.fn();
    render(<ActionButtonBar onCorrect={() => {}} onSkip={() => {}} onFoul={onFoul} />);
    fireEvent.press(screen.getByLabelText('Foul'));
    expect(onFoul).toHaveBeenCalledTimes(1);
  });

  it('disables Skip when the skip limit is reached', () => {
    const onSkip = jest.fn();
    render(<ActionButtonBar onCorrect={() => {}} onSkip={onSkip} skipDisabled />);
    fireEvent.press(screen.getByLabelText('Skip'));
    expect(onSkip).not.toHaveBeenCalled();
  });
});
