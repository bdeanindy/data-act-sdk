export type AuditEvent = {
  subjectId: string;
  actor: string;
  action: 'READ'|'WRITE'|'DELETE'|'PROCESS';
  resource: string;
  timestamp: number;
  purpose?: string;
};

export class AuditLedger {
  private events: AuditEvent[] = [];

  log(e: AuditEvent): AuditEvent {
    if (!e.subjectId || !e.actor || !e.action || !e.resource) {
      throw new Error('Invalid audit event');
    }
    this.events.push(e);
    return e;
  }

  list(subjectId: string): AuditEvent[] {
    return this.events.filter(ev => ev.subjectId === subjectId);
  }

  since(subjectId: string, sinceTs: number): AuditEvent[] {
    return this.list(subjectId).filter(ev => ev.timestamp >= sinceTs);
  }
}
