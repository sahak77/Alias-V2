import { fireEvent, render, screen } from '@testing-library/react-native';
import { Stepper } from './Stepper';

const signed = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');

describe('Stepper', () => {
  it('formats the value and steps within bounds', () => {
    const onChange = jest.fn();
    render(<Stepper value={-2} onChange={onChange} min={-5} max={0} step={1} format={signed} />);

    expect(screen.getByText('−2')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(-1);

    fireEvent.press(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(-3);
  });

  it('appends a suffix when no formatter is given', () => {
    render(<Stepper value={60} onChange={jest.fn()} min={15} max={300} step={15} suffix="s" />);
    expect(screen.getByText('60s')).toBeTruthy();
  });
});
