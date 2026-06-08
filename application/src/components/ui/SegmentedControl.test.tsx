import { fireEvent, render, screen } from '@testing-library/react-native';
import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { label: 'Time Score', value: 'time' },
  { label: 'Max Score', value: 'max' },
] as const;

describe('SegmentedControl', () => {
  it('renders every option', () => {
    render(<SegmentedControl options={OPTIONS} value="time" onChange={() => {}} />);
    expect(screen.getByText('Time Score')).toBeTruthy();
    expect(screen.getByText('Max Score')).toBeTruthy();
  });

  it('reports the selected value on press', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={OPTIONS} value="time" onChange={onChange} />);
    fireEvent.press(screen.getByText('Max Score'));
    expect(onChange).toHaveBeenCalledWith('max');
  });

  it('marks the active segment as selected', () => {
    render(<SegmentedControl options={OPTIONS} value="max" onChange={() => {}} />);
    expect(screen.getByLabelText('Max Score').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Time Score').props.accessibilityState).toMatchObject({ selected: false });
  });
});
