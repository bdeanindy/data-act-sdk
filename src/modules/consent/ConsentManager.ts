export type ConsentRecord = {
  subjectId: string;
  purpose: string;
  granted: boolean;
  timestamp: number;
};

export class ConsentManager {
  private ledger: ConsentRecord[] = [];

  grant(subjectId: string, purpose: string, time: number = Date.now()): ConsentRecord {
    const rec = { subjectId, purpose, granted: true, timestamp: time };
    this.ledger.push(rec);
    return rec;
  }

  revoke(subjectId: string, purpose: string, time: number = Date.now()): ConsentRecord {
    const rec = { subjectId, purpose, granted: false, timestamp: time };
    this.ledger.push(rec);
    return rec;
  }

  latest(subjectId: string, purpose: string): ConsentRecord | undefined {
    for (let i = this.ledger.length - 1; i >= 0; i--) {
      const rec = this.ledger[i];
      if (rec.subjectId === subjectId && rec.purpose === purpose) return rec;
    }
    return undefined;
  }

  history(subjectId: string, purpose?: string): ConsentRecord[] {
    return this.ledger.filter(r => r.subjectId === subjectId && (purpose ? r.purpose === purpose : true));
  }
}
