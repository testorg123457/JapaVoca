import { PermissionsAndroid } from 'react-native';
import { mapAndroidResult } from '../src/lib/permissions';

describe('mapAndroidResult', () => {
  it('granted → granted', () => {
    expect(mapAndroidResult(PermissionsAndroid.RESULTS.GRANTED)).toBe('granted');
  });
  it('never_ask_again → blocked', () => {
    expect(mapAndroidResult(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)).toBe('blocked');
  });
  it('denied → denied', () => {
    expect(mapAndroidResult(PermissionsAndroid.RESULTS.DENIED)).toBe('denied');
  });
});
