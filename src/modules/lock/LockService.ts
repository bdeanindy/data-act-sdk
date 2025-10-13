export class LockService {
  private lockedSubjects = new Set<string>();

  lock(subjectId: string): boolean {
    this.lockedSubjects.add(subjectId);
    return true;
  }

  unlock(subjectId: string, courtOrderId?: string): boolean {
    // In real implementations, verify courtOrderId via DAO Office / registry
    this.lockedSubjects.delete(subjectId);
    return true;
  }

  isLocked(subjectId: string): boolean {
    return this.lockedSubjects.has(subjectId);
  }
}
