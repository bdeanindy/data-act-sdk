import { AuditLedger } from '../src/modules/audit/AuditLedger';

describe('AuditLedger', () => {
  it('logs and lists events', () => {
    const al = new AuditLedger();
    al.log({ subjectId: 'u', actor: 'svc', action: 'READ', resource: 'profile', timestamp: 1 });
    const list = al.list('u');
    expect(list).toHaveLength(1);
    expect(list[0].actor).toBe('svc');
  });

  it('filters events since timestamp', () => {
    const al = new AuditLedger();
    al.log({ subjectId: 'u', actor: 'svc', action: 'READ', resource: 'profile', timestamp: 10 });
    al.log({ subjectId: 'u', actor: 'svc', action: 'WRITE', resource: 'profile', timestamp: 20 });
    const recent = al.since('u', 15);
    expect(recent).toHaveLength(1);
    expect(recent[0].action).toBe('WRITE');
  });

  it('rejects invalid events', () => {
    const al = new AuditLedger();
    expect(() => al.log({ subjectId: '', actor: '', action: 'READ' as any, resource: '', timestamp: 0 }))
      .toThrow();
  });
});
