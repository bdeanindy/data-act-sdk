import { ConsentManager } from '../src/modules/consent/ConsentManager';

describe('ConsentManager', () => {
  it('grants and revokes consent with correct latest state', () => {
    const cm = new ConsentManager();
    const t1 = 1000, t2 = 2000;
    cm.grant('user1', 'analytics', t1);
    cm.revoke('user1', 'analytics', t2);
    const latest = cm.latest('user1', 'analytics');
    expect(latest?.granted).toBe(false);
    expect(latest?.timestamp).toBe(t2);
  });

  it('returns full history', () => {
    const cm = new ConsentManager();
    cm.grant('u', 'ads', 1);
    cm.revoke('u', 'ads', 2);
    expect(cm.history('u', 'ads')).toHaveLength(2);
  });
});
