import React from 'react';
import { render } from '@testing-library/react-native';

// GridBackground uses Skia directly and cannot run in Jest. Mock the whole
// component (and the ScreenShell that imports it) to avoid the native module crash.
jest.mock('@/ui/components/GridBackground', () => ({
  GridBackground: () => null,
}));
jest.mock('@shopify/react-native-skia', () => ({}));

import { ChapterClearedScreen } from '@/app/screens/ChapterClearedScreen';
import { useHudStore } from '@/ui/hudStore';
import { bootstrap } from '@/app/bootstrap';

beforeAll(() => { bootstrap(); });

describe('ChapterClearedScreen', () => {
  it('renders without crash given a pending payload', () => {
    useHudStore.setState({
      pendingChapterClear: [{
        chapterIdx: 0,
        rewards: {
          towerKinds: ['firewall'],
          paletteId: 'palette/intranet',
          medalId: 'medal/c0',
        },
      }],
    });

    const navigation = { replace: () => {}, navigate: () => {}, goBack: () => {}, setOptions: () => {} } as any;
    const route = { params: { winParams: { levelId: 'lvl-c0-m9', difficulty: 'normal', stars: 3 as 3, shards: 30, totalWaves: 10 } } } as any;
    expect(() => render(<ChapterClearedScreen navigation={navigation} route={route} />)).not.toThrow();
  });
});
