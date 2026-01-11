/**
 * InsightIcon Component Tests
 *
 * Tests for the custom SVG icon library.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';

describe('InsightIcon', () => {
  const iconNames: InsightIconName[] = [
    'home',
    'calendar',
    'check',
    'checkCircle',
    'dots',
    'sparkle',
    'plus',
    'minus',
    'play',
    'pause',
    'stop',
    'smile',
    'file',
    'target',
    'briefcase',
    'gift',
    'barChart',
    'users',
    'pin',
    'tag',
    'node',
    'settings',
    'chevronLeft',
    'chevronRight',
    'lock',
    'mic',
    'micOff',
  ];

  describe('Rendering', () => {
    it.each(iconNames)('renders %s icon without crashing', (iconName) => {
      const { toJSON } = render(<InsightIcon name={iconName} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with default props', () => {
      const { toJSON } = render(<InsightIcon name="home" />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with custom size', () => {
      const { toJSON } = render(<InsightIcon name="home" size={32} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with custom color', () => {
      const { toJSON } = render(<InsightIcon name="home" color="#FF0000" />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with custom size and color', () => {
      const { toJSON } = render(<InsightIcon name="calendar" size={48} color="#00FF00" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has default accessibility label', () => {
      const { getByLabelText } = render(<InsightIcon name="home" />);
      expect(getByLabelText('Home')).toBeTruthy();
    });

    it('accepts custom accessibility label', () => {
      const { getByLabelText } = render(
        <InsightIcon name="home" accessibilityLabel="Custom Home Label" />
      );
      expect(getByLabelText('Custom Home Label')).toBeTruthy();
    });

    it.each([
      ['home', 'Home'],
      ['calendar', 'Calendar'],
      ['check', 'Checkbox'],
      ['plus', 'Add'],
      ['minus', 'Remove'],
      ['settings', 'Settings'],
      ['lock', 'Lock'],
      ['mic', 'Microphone'],
    ] as const)('icon %s has correct default label "%s"', (iconName, expectedLabel) => {
      const { getByLabelText } = render(<InsightIcon name={iconName} />);
      expect(getByLabelText(expectedLabel)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('returns null for unknown icon name', () => {
      // @ts-expect-error - Testing invalid icon name
      const { toJSON } = render(<InsightIcon name="unknown-icon" />);
      expect(toJSON()).toBeNull();
    });

    it('handles size of 0', () => {
      const { toJSON } = render(<InsightIcon name="home" size={0} />);
      expect(toJSON()).toBeTruthy();
    });

    it('handles very large size', () => {
      const { toJSON } = render(<InsightIcon name="home" size={1000} />);
      expect(toJSON()).toBeTruthy();
    });

    it('handles empty color string gracefully', () => {
      const { toJSON } = render(<InsightIcon name="home" color="" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Memoization', () => {
    it('is memoized for performance', () => {
      const { rerender, toJSON } = render(<InsightIcon name="home" size={20} color="#000" />);
      const firstRender = toJSON();

      rerender(<InsightIcon name="home" size={20} color="#000" />);
      const secondRender = toJSON();

      // Deep equality check
      expect(JSON.stringify(firstRender)).toBe(JSON.stringify(secondRender));
    });
  });
});
