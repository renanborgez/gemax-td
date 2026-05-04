import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('jest smoke', () => {
  it('renders Text', () => {
    const { getByText } = render(<Text>hello</Text>);
    expect(getByText('hello')).toBeTruthy();
  });
});
