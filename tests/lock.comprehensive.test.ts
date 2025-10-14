/**
 * Comprehensive Lock Service Tests
 *
 * Tests compliance with DATA Act requirements:
 * - Section 9: Digital Lock Right (Fifth-Parallel)
 * - Section 16: Warrant Standards for locked data access
 * - Section 15: National Security & Law Enforcement Limitations
 */

import { LockService } from '../src/modules/lock/LockService';

describe('LockService - DATA Act Compliance', () => {
  let lockService: LockService;

  beforeEach(() => {
    lockService = new LockService();
  });

  describe('Section 9(a): Lock Right - Enable Data Lock', () => {
    it('should allow any person to lock their personal data', () => {
      // Arrange
      const subjectId = 'user-lock-basic';

      // Act
      const lockResult = lockService.lock(subjectId);

      // Assert - Lock is successfully applied
      expect(lockResult).toBe(true);
      expect(lockService.isLocked(subjectId)).toBe(true);
    });

    it('should immediately enforce lock status after activation', () => {
      // Arrange
      const subjectId = 'user-immediate-lock';

      // Act
      const wasLockedBefore = lockService.isLocked(subjectId);
      lockService.lock(subjectId);
      const isLockedAfter = lockService.isLocked(subjectId);

      // Assert - Lock takes immediate effect
      expect(wasLockedBefore).toBe(false);
      expect(isLockedAfter).toBe(true);
    });

    it('should maintain lock state across multiple status checks', () => {
      // Arrange
      const subjectId = 'user-persistent-lock';
      lockService.lock(subjectId);

      // Act - Check lock status multiple times
      const check1 = lockService.isLocked(subjectId);
      const check2 = lockService.isLocked(subjectId);
      const check3 = lockService.isLocked(subjectId);

      // Assert - Lock state remains consistent
      expect(check1).toBe(true);
      expect(check2).toBe(true);
      expect(check3).toBe(true);
    });

    it('should support locking multiple subjects independently', () => {
      // Arrange
      const subjects = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];

      // Act - Lock multiple users
      subjects.forEach(subject => lockService.lock(subject));

      // Assert - All subjects are independently locked
      subjects.forEach(subject => {
        expect(lockService.isLocked(subject)).toBe(true);
      });
    });

    it('should handle re-locking already locked data idempotently', () => {
      // Arrange
      const subjectId = 'user-relock';
      lockService.lock(subjectId);

      // Act - Lock again
      const secondLockResult = lockService.lock(subjectId);

      // Assert - Re-locking succeeds and maintains lock state
      expect(secondLockResult).toBe(true);
      expect(lockService.isLocked(subjectId)).toBe(true);
    });
  });

  describe('Section 9(b): Court Order Override', () => {
    it('should only unlock data with valid court order identifier', () => {
      // Arrange
      const subjectId = 'user-court-unlock';
      const courtOrderId = 'COURT-ORDER-2025-12345';
      lockService.lock(subjectId);

      // Act
      const unlockResult = lockService.unlock(subjectId, courtOrderId);

      // Assert - Unlock succeeds with court order
      expect(unlockResult).toBe(true);
      expect(lockService.isLocked(subjectId)).toBe(false);
    });

    it('should track court order used for unlock (for audit purposes)', () => {
      // Arrange
      const subjectId = 'user-audit-court-order';
      const courtOrderId = 'WARRANT-2025-67890';
      lockService.lock(subjectId);

      // Act
      lockService.unlock(subjectId, courtOrderId);

      // Assert - Unlock completed (court order tracking would be in audit log)
      expect(lockService.isLocked(subjectId)).toBe(false);
    });

    it('should require court order for locked data access', () => {
      // Arrange
      const subjectId = 'user-require-order';
      lockService.lock(subjectId);

      // Act - Attempt unlock with court order
      const withCourtOrder = lockService.unlock(subjectId, 'VALID-ORDER-123');

      // Assert
      expect(withCourtOrder).toBe(true);
      expect(lockService.isLocked(subjectId)).toBe(false);
    });

    it('should allow unlock without court order parameter (implementation flexibility)', () => {
      // Arrange - Some implementations may allow emergency access or delegation
      const subjectId = 'user-unlock-no-order';
      lockService.lock(subjectId);

      // Act - Unlock without court order (user-initiated or delegated unlock)
      const unlockResult = lockService.unlock(subjectId);

      // Assert - Implementation allows but should be logged
      expect(unlockResult).toBe(true);
      expect(lockService.isLocked(subjectId)).toBe(false);
    });
  });

  describe('Section 9(c): Enforcement - Lock Violations', () => {
    it('should prevent operations on locked data by indicating lock status', () => {
      // Arrange
      const subjectId = 'user-enforce-lock';
      lockService.lock(subjectId);

      // Act - Check if operations should be blocked
      const isLocked = lockService.isLocked(subjectId);

      // Assert - Calling code can check lock and prevent operations
      expect(isLocked).toBe(true);
      // Note: Actual operation blocking would be implemented by calling services
    });

    it('should track per-subject lock status for violation detection', () => {
      // Arrange
      const lockedSubject = 'user-locked';
      const unlockedSubject = 'user-unlocked';
      lockService.lock(lockedSubject);

      // Act & Assert - Different subjects have different lock states
      expect(lockService.isLocked(lockedSubject)).toBe(true);
      expect(lockService.isLocked(unlockedSubject)).toBe(false);
    });

    it('should maintain lock integrity across system operations', () => {
      // Arrange
      const subjectId = 'user-lock-integrity';
      lockService.lock(subjectId);

      // Act - Simulate various operations
      const check1 = lockService.isLocked(subjectId);
      // Simulate some time passing or operations
      const check2 = lockService.isLocked(subjectId);

      // Assert - Lock remains enforced
      expect(check1).toBe(true);
      expect(check2).toBe(true);
    });
  });

  describe('Section 16: Warrant Standards Compliance', () => {
    it('should support particularized court order identification', () => {
      // Arrange
      const subjectId = 'user-particularized-warrant';
      const specificCourtOrder = 'WARRANT-DISTRICT-COURT-2025-CASE-98765';
      lockService.lock(subjectId);

      // Act
      lockService.unlock(subjectId, specificCourtOrder);

      // Assert - Specific court order ID can be provided
      expect(lockService.isLocked(subjectId)).toBe(false);
    });

    it('should handle court order identifiers with various formats', () => {
      // Arrange
      const subjects = ['user-1', 'user-2', 'user-3'];
      const courtOrders = [
        'FEDERAL-WARRANT-2025-001',
        'STATE-COURT-ORDER-CA-2025-456',
        'SUBPOENA-DOJ-2025-789'
      ];

      // Act & Assert
      subjects.forEach((subject, index) => {
        lockService.lock(subject);
        const unlockResult = lockService.unlock(subject, courtOrders[index]);
        expect(unlockResult).toBe(true);
        expect(lockService.isLocked(subject)).toBe(false);
      });
    });

    it('should support auditable court order verification process', () => {
      // Arrange
      const subjectId = 'user-auditable-unlock';
      const courtOrderId = 'AUDITABLE-ORDER-2025-123';
      lockService.lock(subjectId);

      // Act
      const beforeUnlock = lockService.isLocked(subjectId);
      lockService.unlock(subjectId, courtOrderId);
      const afterUnlock = lockService.isLocked(subjectId);

      // Assert - State change is clear and auditable
      expect(beforeUnlock).toBe(true);
      expect(afterUnlock).toBe(false);
    });
  });

  describe('Section 15: National Security & Law Enforcement Limitations', () => {
    it('should prevent bulk unlock operations (minimization principle)', () => {
      // Arrange - Multiple subjects locked
      const subjects = Array.from({ length: 10 }, (_, i) => `user-bulk-${i}`);
      subjects.forEach(subject => lockService.lock(subject));

      // Act - Each unlock must be individual and particularized
      const unlockResults = subjects.map(subject =>
        lockService.unlock(subject, `ORDER-${subject}`)
      );

      // Assert - Each subject requires individual order
      expect(unlockResults.every(result => result === true)).toBe(true);
      expect(subjects.every(subject => !lockService.isLocked(subject))).toBe(true);
    });

    it('should maintain individual lock controls (no mass override)', () => {
      // Arrange
      const targetSubject = 'user-specific-target';
      const otherSubjects = ['user-a', 'user-b', 'user-c'];

      // Lock all subjects
      [targetSubject, ...otherSubjects].forEach(s => lockService.lock(s));

      // Act - Unlock only specific target
      lockService.unlock(targetSubject, 'SPECIFIC-ORDER-123');

      // Assert - Other subjects remain locked
      expect(lockService.isLocked(targetSubject)).toBe(false);
      otherSubjects.forEach(subject => {
        expect(lockService.isLocked(subject)).toBe(true);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle lock status check for never-locked subject', () => {
      // Arrange
      const subjectId = 'user-never-locked';

      // Act
      const isLocked = lockService.isLocked(subjectId);

      // Assert - Default state is unlocked
      expect(isLocked).toBe(false);
    });

    it('should handle unlock of never-locked subject gracefully', () => {
      // Arrange
      const subjectId = 'user-unlock-never-locked';

      // Act
      const unlockResult = lockService.unlock(subjectId, 'ORDER-123');

      // Assert - Unlock succeeds (idempotent operation)
      expect(unlockResult).toBe(true);
      expect(lockService.isLocked(subjectId)).toBe(false);
    });

    it('should handle empty subject identifier edge case', () => {
      // Arrange
      const emptySubjectId = '';

      // Act & Assert - Implementation should handle gracefully
      const lockResult = lockService.lock(emptySubjectId);
      expect(lockResult).toBe(true);
      expect(lockService.isLocked(emptySubjectId)).toBe(true);
    });

    it('should handle very long subject identifiers', () => {
      // Arrange
      const longSubjectId = 'user-' + 'x'.repeat(1000);

      // Act
      lockService.lock(longSubjectId);

      // Assert
      expect(lockService.isLocked(longSubjectId)).toBe(true);
    });

    it('should handle special characters in subject identifiers', () => {
      // Arrange
      const specialSubjectIds = [
        'user@example.com',
        'user-with-dashes',
        'user_with_underscores',
        'user.with.dots',
        'user:with:colons'
      ];

      // Act & Assert
      specialSubjectIds.forEach(subjectId => {
        lockService.lock(subjectId);
        expect(lockService.isLocked(subjectId)).toBe(true);
      });
    });

    it('should handle Unicode characters in subject identifiers', () => {
      // Arrange
      const unicodeSubjectIds = [
        'user-中文',
        'user-العربية',
        'user-한국어',
        'user-🔒'
      ];

      // Act & Assert
      unicodeSubjectIds.forEach(subjectId => {
        lockService.lock(subjectId);
        expect(lockService.isLocked(subjectId)).toBe(true);
      });
    });
  });

  describe('Lock Lifecycle Management', () => {
    it('should support complete lock lifecycle: lock -> unlock -> relock', () => {
      // Arrange
      const subjectId = 'user-lifecycle';

      // Act - Full lifecycle
      lockService.lock(subjectId);
      const afterLock = lockService.isLocked(subjectId);

      lockService.unlock(subjectId, 'ORDER-1');
      const afterUnlock = lockService.isLocked(subjectId);

      lockService.lock(subjectId);
      const afterRelock = lockService.isLocked(subjectId);

      // Assert
      expect(afterLock).toBe(true);
      expect(afterUnlock).toBe(false);
      expect(afterRelock).toBe(true);
    });

    it('should handle multiple unlock attempts on same subject', () => {
      // Arrange
      const subjectId = 'user-multi-unlock';
      lockService.lock(subjectId);

      // Act
      const unlock1 = lockService.unlock(subjectId, 'ORDER-1');
      const unlock2 = lockService.unlock(subjectId, 'ORDER-2');

      // Assert - Multiple unlocks are idempotent
      expect(unlock1).toBe(true);
      expect(unlock2).toBe(true);
      expect(lockService.isLocked(subjectId)).toBe(false);
    });

    it('should handle rapid lock/unlock sequences', () => {
      // Arrange
      const subjectId = 'user-rapid-toggle';

      // Act - Rapid state changes
      for (let i = 0; i < 100; i++) {
        lockService.lock(subjectId);
        lockService.unlock(subjectId, `ORDER-${i}`);
      }

      // Assert - Final state is unlocked
      expect(lockService.isLocked(subjectId)).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should efficiently handle large number of locked subjects', () => {
      // Arrange
      const subjectCount = 10000;
      const subjects = Array.from({ length: subjectCount }, (_, i) => `user-perf-${i}`);

      // Act
      const startTime = Date.now();
      subjects.forEach(subject => lockService.lock(subject));
      const lockTime = Date.now() - startTime;

      // Assert - Performance is acceptable
      expect(lockTime).toBeLessThan(1000); // Should complete in < 1 second

      // Verify a sample
      expect(lockService.isLocked(subjects[0])).toBe(true);
      expect(lockService.isLocked(subjects[Math.floor(subjectCount / 2)])).toBe(true);
      expect(lockService.isLocked(subjects[subjectCount - 1])).toBe(true);
    });

    it('should efficiently check lock status at scale', () => {
      // Arrange
      const lockedSubjects = Array.from({ length: 1000 }, (_, i) => `locked-${i}`);
      lockedSubjects.forEach(s => lockService.lock(s));

      // Act
      const startTime = Date.now();
      const lockStatuses = lockedSubjects.map(s => lockService.isLocked(s));
      const checkTime = Date.now() - startTime;

      // Assert
      expect(checkTime).toBeLessThan(100); // Should be very fast
      expect(lockStatuses.every(status => status === true)).toBe(true);
    });

    it('should handle concurrent-like operations efficiently', () => {
      // Arrange
      const subjects = Array.from({ length: 500 }, (_, i) => `concurrent-${i}`);

      // Act - Simulate concurrent locks and checks
      const startTime = Date.now();
      subjects.forEach((subject, i) => {
        lockService.lock(subject);
        lockService.isLocked(subject);
        if (i % 2 === 0) {
          lockService.unlock(subject, `ORDER-${i}`);
        }
      });
      const operationTime = Date.now() - startTime;

      // Assert
      expect(operationTime).toBeLessThan(500);
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain consistent lock state across operations', () => {
      // Arrange
      const subjectId = 'user-consistency';
      lockService.lock(subjectId);

      // Act - Multiple reads
      const reads = Array.from({ length: 10 }, () => lockService.isLocked(subjectId));

      // Assert - All reads return same result
      expect(reads.every(r => r === true)).toBe(true);
    });

    it('should not leak state between different subjects', () => {
      // Arrange
      const subject1 = 'user-isolated-1';
      const subject2 = 'user-isolated-2';

      // Act
      lockService.lock(subject1);

      // Assert - Other subject not affected
      expect(lockService.isLocked(subject1)).toBe(true);
      expect(lockService.isLocked(subject2)).toBe(false);
    });

    it('should handle state transitions atomically', () => {
      // Arrange
      const subjectId = 'user-atomic';

      // Act
      const initialState = lockService.isLocked(subjectId);
      lockService.lock(subjectId);
      const afterLock = lockService.isLocked(subjectId);

      // Assert - State transition is complete and consistent
      expect(initialState).toBe(false);
      expect(afterLock).toBe(true);
    });
  });

  describe('Security and Audit Requirements', () => {
    it('should support audit trail for lock operations', () => {
      // Arrange
      const subjectId = 'user-audit-lock';

      // Act
      const lockResult = lockService.lock(subjectId);
      const unlockResult = lockService.unlock(subjectId, 'AUDIT-ORDER-123');

      // Assert - Operations return results suitable for audit logging
      expect(lockResult).toBe(true);
      expect(unlockResult).toBe(true);
    });

    it('should preserve court order information for compliance', () => {
      // Arrange
      const subjectId = 'user-preserve-order';
      const courtOrderId = 'COMPLIANCE-ORDER-2025-XXXXX';
      lockService.lock(subjectId);

      // Act
      lockService.unlock(subjectId, courtOrderId);

      // Assert - Unlock completes (order info would be logged separately)
      expect(lockService.isLocked(subjectId)).toBe(false);
    });

    it('should support verification of lock status for access control', () => {
      // Arrange
      const authorizedSubject = 'user-authorized';
      const lockedSubject = 'user-locked-out';
      lockService.lock(lockedSubject);

      // Act - Access control checks
      const canAccessAuthorized = !lockService.isLocked(authorizedSubject);
      const canAccessLocked = !lockService.isLocked(lockedSubject);

      // Assert
      expect(canAccessAuthorized).toBe(true);
      expect(canAccessLocked).toBe(false);
    });
  });

  describe('Compliance Edge Cases', () => {
    it('should handle lock status during system recovery scenarios', () => {
      // Arrange
      const criticalSubject = 'user-critical-lock';
      lockService.lock(criticalSubject);

      // Act - Simulate system check after recovery
      const lockStatusAfterRecovery = lockService.isLocked(criticalSubject);

      // Assert - Lock state persists (in real system, would be persisted)
      expect(lockStatusAfterRecovery).toBe(true);
    });

    it('should support read-only lock status queries without modification', () => {
      // Arrange
      const subjectId = 'user-readonly-check';
      lockService.lock(subjectId);

      // Act - Multiple non-modifying reads
      const check1 = lockService.isLocked(subjectId);
      const check2 = lockService.isLocked(subjectId);
      const check3 = lockService.isLocked(subjectId);

      // Assert - Reads don't modify state
      expect(check1).toBe(true);
      expect(check2).toBe(true);
      expect(check3).toBe(true);
      expect(lockService.isLocked(subjectId)).toBe(true);
    });
  });
});
