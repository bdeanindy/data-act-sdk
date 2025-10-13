import { LockService } from '../src/modules/lock/LockService';

describe('LockService', () => {
  it('locks and unlocks subjects', () => {
    const ls = new LockService();
    expect(ls.isLocked('u')).toBe(false);
    ls.lock('u');
    expect(ls.isLocked('u')).toBe(true);
    ls.unlock('u', 'order-123');
    expect(ls.isLocked('u')).toBe(false);
  });
});
