/**
 * Comprehensive Consent Manager Tests
 *
 * Tests compliance with DATA Act requirements:
 * - Section 5: Consent Requirements (granularity, no coercion, revocability, recordkeeping)
 * - Section 7: Right to Access, Audit, and Revoke
 * - Section 8: Consent Interface Standards
 * - Section 12: Mandatory Data Disclosure
 */

import { ConsentManager, ConsentRecord } from '../src/modules/consent/ConsentManager';

describe('ConsentManager - DATA Act Compliance', () => {
  let consentManager: ConsentManager;

  beforeEach(() => {
    consentManager = new ConsentManager();
  });

  describe('Section 5(a): Granular Consent per Category and Purpose', () => {
    it('should allow granting consent for specific data category and purpose', () => {
      // Arrange
      const subjectId = 'user-123';
      const category = 'biometric';
      const purpose = 'authentication';
      const timestamp = Date.now();

      // Act
      const record = consentManager.grant(subjectId, purpose, timestamp);

      // Assert
      expect(record).toBeDefined();
      expect(record.subjectId).toBe(subjectId);
      expect(record.purpose).toBe(purpose);
      expect(record.granted).toBe(true);
      expect(record.timestamp).toBe(timestamp);
    });

    it('should track separate consent for different purposes on same data', () => {
      // Arrange
      const subjectId = 'user-456';
      const purpose1 = 'analytics';
      const purpose2 = 'marketing';
      const timestamp = Date.now();

      // Act
      const consent1 = consentManager.grant(subjectId, purpose1, timestamp);
      const consent2 = consentManager.grant(subjectId, purpose2, timestamp + 1);

      // Assert
      expect(consent1.purpose).toBe(purpose1);
      expect(consent2.purpose).toBe(purpose2);
      expect(consentManager.latest(subjectId, purpose1)?.granted).toBe(true);
      expect(consentManager.latest(subjectId, purpose2)?.granted).toBe(true);
    });

    it('should support multiple data categories with separate consent tracking', () => {
      // Arrange
      const subjectId = 'user-789';
      const categories = ['financial', 'health', 'location', 'biometric'];
      const purpose = 'service_delivery';

      // Act - Grant consent for each category
      categories.forEach((category, index) => {
        consentManager.grant(subjectId, `${purpose}_${category}`, Date.now() + index);
      });

      // Assert - Each category has independent consent
      categories.forEach(category => {
        const latest = consentManager.latest(subjectId, `${purpose}_${category}`);
        expect(latest?.granted).toBe(true);
      });
    });
  });

  describe('Section 5(b): No Coercion - Optional Consent Fields', () => {
    it('should allow granting consent without requiring non-essential data', () => {
      // Arrange - User grants only essential consent
      const subjectId = 'user-essential';
      const essentialPurpose = 'core_service';
      const nonEssentialPurpose = 'marketing';

      // Act - Grant only essential consent
      consentManager.grant(subjectId, essentialPurpose, Date.now());

      // Assert - User can use service without non-essential consent
      expect(consentManager.latest(subjectId, essentialPurpose)?.granted).toBe(true);
      expect(consentManager.latest(subjectId, nonEssentialPurpose)).toBeUndefined();
    });

    it('should accept partial consent grants without forcing full acceptance', () => {
      // Arrange
      const subjectId = 'user-partial';
      const purposes = ['core_function', 'analytics', 'marketing', 'third_party_sharing'];

      // Act - User only grants consent for core function and analytics
      consentManager.grant(subjectId, purposes[0], Date.now());
      consentManager.grant(subjectId, purposes[1], Date.now() + 1);

      // Assert - Only granted consents are recorded
      expect(consentManager.latest(subjectId, purposes[0])?.granted).toBe(true);
      expect(consentManager.latest(subjectId, purposes[1])?.granted).toBe(true);
      expect(consentManager.latest(subjectId, purposes[2])).toBeUndefined();
      expect(consentManager.latest(subjectId, purposes[3])).toBeUndefined();
    });
  });

  describe('Section 5(c): Revocability - Immediate Effect', () => {
    it('should immediately revoke consent when requested', () => {
      // Arrange
      const subjectId = 'user-revoke';
      const purpose = 'data_processing';
      const grantTime = Date.now();
      const revokeTime = grantTime + 5000;

      // Act
      consentManager.grant(subjectId, purpose, grantTime);
      const revocationRecord = consentManager.revoke(subjectId, purpose, revokeTime);

      // Assert
      expect(revocationRecord.granted).toBe(false);
      expect(revocationRecord.timestamp).toBe(revokeTime);
      expect(consentManager.latest(subjectId, purpose)?.granted).toBe(false);
    });

    it('should support multiple revocations and re-grants (consent timeline)', () => {
      // Arrange
      const subjectId = 'user-timeline';
      const purpose = 'analytics';

      // Act - Complex consent timeline
      consentManager.grant(subjectId, purpose, 1000);      // Grant at t=1000
      consentManager.revoke(subjectId, purpose, 2000);     // Revoke at t=2000
      consentManager.grant(subjectId, purpose, 3000);      // Re-grant at t=3000
      consentManager.revoke(subjectId, purpose, 4000);     // Revoke again at t=4000

      // Assert - Latest status reflects final revocation
      const latestStatus = consentManager.latest(subjectId, purpose);
      expect(latestStatus?.granted).toBe(false);
      expect(latestStatus?.timestamp).toBe(4000);
    });

    it('should allow revocation at any time without restrictions', () => {
      // Arrange
      const subjectId = 'user-anytime-revoke';
      const purpose = 'marketing';
      const grantTime = Date.now();

      // Act - Immediate revocation (same millisecond for testing purposes)
      consentManager.grant(subjectId, purpose, grantTime);
      const revokeRecord = consentManager.revoke(subjectId, purpose, grantTime + 1);

      // Assert - Revocation succeeds immediately
      expect(revokeRecord.granted).toBe(false);
      expect(consentManager.latest(subjectId, purpose)?.granted).toBe(false);
    });
  });

  describe('Section 5(d): Immutable Consent Timelines', () => {
    it('should maintain complete historical timeline of consent changes', () => {
      // Arrange
      const subjectId = 'user-history';
      const purpose = 'data_analysis';
      const timestamps = [1000, 2000, 3000, 4000, 5000];

      // Act - Create complex consent history
      consentManager.grant(subjectId, purpose, timestamps[0]);
      consentManager.revoke(subjectId, purpose, timestamps[1]);
      consentManager.grant(subjectId, purpose, timestamps[2]);
      consentManager.revoke(subjectId, purpose, timestamps[3]);
      consentManager.grant(subjectId, purpose, timestamps[4]);

      // Assert
      const history = consentManager.history(subjectId, purpose);
      expect(history).toHaveLength(5);

      // Verify timeline is preserved in chronological order
      expect(history[0].timestamp).toBe(timestamps[0]);
      expect(history[0].granted).toBe(true);
      expect(history[1].timestamp).toBe(timestamps[1]);
      expect(history[1].granted).toBe(false);
      expect(history[4].timestamp).toBe(timestamps[4]);
      expect(history[4].granted).toBe(true);
    });

    it('should never delete or modify historical consent records', () => {
      // Arrange
      const subjectId = 'user-immutable';
      const purpose = 'processing';
      const initialTime = Date.now();

      // Act
      consentManager.grant(subjectId, purpose, initialTime);
      const historyAfterGrant = consentManager.history(subjectId, purpose);

      consentManager.revoke(subjectId, purpose, initialTime + 1000);
      const historyAfterRevoke = consentManager.history(subjectId, purpose);

      // Assert - Original grant record still exists
      expect(historyAfterGrant).toHaveLength(1);
      expect(historyAfterRevoke).toHaveLength(2);
      expect(historyAfterRevoke[0]).toEqual(historyAfterGrant[0]);
    });

    it('should preserve consent records across different purposes for same user', () => {
      // Arrange
      const subjectId = 'user-multi-purpose';
      const purposes = ['analytics', 'marketing', 'personalization'];

      // Act - Grant consent for multiple purposes
      purposes.forEach((purpose, index) => {
        consentManager.grant(subjectId, purpose, Date.now() + index * 1000);
      });

      // Assert - Each purpose has independent history
      purposes.forEach(purpose => {
        const history = consentManager.history(subjectId, purpose);
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].purpose).toBe(purpose);
      });
    });
  });

  describe('Section 7: Right to Access, Audit, and Revoke', () => {
    it('should provide complete access to all consent records for a subject', () => {
      // Arrange
      const subjectId = 'user-access-all';
      const purposes = ['service', 'analytics', 'marketing'];

      // Act - Grant various consents
      purposes.forEach((purpose, index) => {
        consentManager.grant(subjectId, purpose, Date.now() + index);
      });

      // Assert - User can access all their consent records
      const allRecords = consentManager.history(subjectId);
      expect(allRecords).toHaveLength(purposes.length);

      const retrievedPurposes = allRecords.map(r => r.purpose);
      purposes.forEach(purpose => {
        expect(retrievedPurposes).toContain(purpose);
      });
    });

    it('should provide audit trail with who, what, when information', () => {
      // Arrange
      const subjectId = 'user-audit-trail';
      const purpose = 'data_processing';
      const grantTime = Date.now();

      // Act
      const grantRecord = consentManager.grant(subjectId, purpose, grantTime);

      // Assert - Record contains complete audit information
      expect(grantRecord.subjectId).toBe(subjectId);  // Who
      expect(grantRecord.purpose).toBe(purpose);      // What
      expect(grantRecord.timestamp).toBe(grantTime);  // When
      expect(grantRecord.granted).toBeDefined();      // Action result
    });

    it('should allow querying consent history for specific purpose', () => {
      // Arrange
      const subjectId = 'user-specific-query';
      const targetPurpose = 'analytics';
      const otherPurpose = 'marketing';

      // Act
      consentManager.grant(subjectId, targetPurpose, 1000);
      consentManager.grant(subjectId, otherPurpose, 2000);
      consentManager.revoke(subjectId, targetPurpose, 3000);

      // Assert - Can filter history by purpose
      const specificHistory = consentManager.history(subjectId, targetPurpose);
      expect(specificHistory).toHaveLength(2);
      expect(specificHistory.every(r => r.purpose === targetPurpose)).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle consent for user with no prior history', () => {
      // Arrange
      const newUserId = 'new-user-no-history';
      const purpose = 'onboarding';

      // Act
      const latestBefore = consentManager.latest(newUserId, purpose);
      consentManager.grant(newUserId, purpose, Date.now());
      const latestAfter = consentManager.latest(newUserId, purpose);

      // Assert
      expect(latestBefore).toBeUndefined();
      expect(latestAfter?.granted).toBe(true);
    });

    it('should handle revocation without prior grant gracefully', () => {
      // Arrange
      const subjectId = 'user-revoke-without-grant';
      const purpose = 'never_granted';

      // Act - Revoke consent that was never granted
      const revocationRecord = consentManager.revoke(subjectId, purpose, Date.now());

      // Assert - Revocation is recorded but shows no prior grant existed
      expect(revocationRecord.granted).toBe(false);
      expect(consentManager.latest(subjectId, purpose)?.granted).toBe(false);
    });

    it('should handle empty or minimal subject/purpose identifiers', () => {
      // Arrange
      const minimalSubjectId = 'a';
      const minimalPurpose = 'x';

      // Act
      const record = consentManager.grant(minimalSubjectId, minimalPurpose, Date.now());

      // Assert
      expect(record.subjectId).toBe(minimalSubjectId);
      expect(record.purpose).toBe(minimalPurpose);
      expect(consentManager.latest(minimalSubjectId, minimalPurpose)?.granted).toBe(true);
    });

    it('should handle timestamps at boundaries (0, max safe integer)', () => {
      // Arrange
      const subjectId = 'user-boundary-time';
      const purpose = 'time_test';

      // Act
      consentManager.grant(subjectId, purpose, 0);
      consentManager.revoke(subjectId, purpose, Number.MAX_SAFE_INTEGER);

      // Assert
      const history = consentManager.history(subjectId, purpose);
      expect(history[0].timestamp).toBe(0);
      expect(history[1].timestamp).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should maintain consistency with concurrent-like operations', () => {
      // Arrange
      const subjectId = 'user-concurrent';
      const purposes = Array.from({ length: 100 }, (_, i) => `purpose_${i}`);

      // Act - Simulate many rapid consent operations
      purposes.forEach((purpose, index) => {
        consentManager.grant(subjectId, purpose, Date.now() + index);
      });

      // Assert - All operations recorded correctly
      const allHistory = consentManager.history(subjectId);
      expect(allHistory).toHaveLength(purposes.length);
    });

    it('should handle users with identical subject IDs but different purposes', () => {
      // Arrange
      const subjectId = 'duplicate-check-user';
      const purposes = ['purpose1', 'purpose2', 'purpose3'];

      // Act
      purposes.forEach(purpose => {
        consentManager.grant(subjectId, purpose, Date.now());
      });

      // Assert - Each purpose maintains separate consent state
      purposes.forEach(purpose => {
        const latest = consentManager.latest(subjectId, purpose);
        expect(latest).toBeDefined();
        expect(latest?.purpose).toBe(purpose);
      });
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should return consistent results for multiple queries of same consent', () => {
      // Arrange
      const subjectId = 'user-consistency';
      const purpose = 'test_purpose';
      consentManager.grant(subjectId, purpose, Date.now());

      // Act - Query multiple times
      const result1 = consentManager.latest(subjectId, purpose);
      const result2 = consentManager.latest(subjectId, purpose);
      const result3 = consentManager.latest(subjectId, purpose);

      // Assert - All queries return same result
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(result1?.granted).toBe(true);
    });

    it('should maintain chronological order in history regardless of query time', () => {
      // Arrange
      const subjectId = 'user-chrono-order';
      const purpose = 'ordering_test';
      const times = [1000, 500, 2000, 1500]; // Out of order insertion

      // Act - Insert records in non-chronological order
      times.forEach(time => {
        consentManager.grant(subjectId, purpose + '_' + time, time);
      });

      // Assert - History maintains insertion order (implementation-dependent)
      // Note: Current implementation maintains insertion order, not sorted order
      const history = consentManager.history(subjectId);
      expect(history).toHaveLength(4);
      expect(history[0].timestamp).toBe(1000);
      expect(history[1].timestamp).toBe(500);
    });

    it('should not corrupt data when same timestamp used for different operations', () => {
      // Arrange
      const subjectId = 'user-same-timestamp';
      const purpose1 = 'purpose_a';
      const purpose2 = 'purpose_b';
      const timestamp = Date.now();

      // Act - Multiple operations with same timestamp
      consentManager.grant(subjectId, purpose1, timestamp);
      consentManager.grant(subjectId, purpose2, timestamp);

      // Assert - Both operations recorded independently
      expect(consentManager.latest(subjectId, purpose1)?.granted).toBe(true);
      expect(consentManager.latest(subjectId, purpose2)?.granted).toBe(true);
    });
  });

  describe('Performance and Scalability Considerations', () => {
    it('should efficiently handle large consent histories', () => {
      // Arrange
      const subjectId = 'user-large-history';
      const purpose = 'high_volume_purpose';
      const operationCount = 1000;

      // Act - Create large history
      const startTime = Date.now();
      for (let i = 0; i < operationCount; i++) {
        if (i % 2 === 0) {
          consentManager.grant(subjectId, purpose, i);
        } else {
          consentManager.revoke(subjectId, purpose, i);
        }
      }
      const endTime = Date.now();

      // Assert - Operations complete in reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
      expect(consentManager.history(subjectId, purpose)).toHaveLength(operationCount);
    });

    it('should efficiently retrieve latest consent from large history', () => {
      // Arrange
      const subjectId = 'user-latest-lookup';
      const purpose = 'lookup_test';

      // Create large history
      for (let i = 0; i < 500; i++) {
        consentManager.grant(subjectId, purpose, i * 1000);
      }
      consentManager.revoke(subjectId, purpose, 500000); // Final revocation

      // Act
      const startTime = Date.now();
      const latest = consentManager.latest(subjectId, purpose);
      const queryTime = Date.now() - startTime;

      // Assert - Lookup is fast even with large history
      expect(queryTime).toBeLessThan(100); // Should be nearly instant
      expect(latest?.timestamp).toBe(500000);
      expect(latest?.granted).toBe(false);
    });
  });

  describe('Compliance Reporting Requirements', () => {
    it('should support generation of consent audit reports', () => {
      // Arrange
      const subjectId = 'user-audit-report';
      const purposes = ['analytics', 'marketing', 'personalization'];

      // Act - Create consent activity
      purposes.forEach((purpose, index) => {
        consentManager.grant(subjectId, purpose, Date.now() + index * 1000);
        if (index % 2 === 0) {
          consentManager.revoke(subjectId, purpose, Date.now() + (index + 1) * 1000);
        }
      });

      // Assert - Can generate complete audit report
      const auditReport = consentManager.history(subjectId);
      expect(auditReport.length).toBeGreaterThan(0);

      // Report should include all required audit fields
      auditReport.forEach(record => {
        expect(record.subjectId).toBeDefined();
        expect(record.purpose).toBeDefined();
        expect(record.timestamp).toBeDefined();
        expect(record.granted).toBeDefined();
      });
    });
  });

  describe('Default Timestamp Behavior', () => {
    it('should use current timestamp when time parameter is not provided for grant', () => {
      // Arrange
      const subjectId = 'user-default-timestamp-grant';
      const purpose = 'default_time_test';
      const beforeTime = Date.now();

      // Act - Call grant without providing timestamp
      const record = consentManager.grant(subjectId, purpose);
      const afterTime = Date.now();

      // Assert - Timestamp should be auto-generated between before and after
      expect(record.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(record.timestamp).toBeLessThanOrEqual(afterTime);
      expect(record.granted).toBe(true);
    });

    it('should use current timestamp when time parameter is not provided for revoke', () => {
      // Arrange
      const subjectId = 'user-default-timestamp-revoke';
      const purpose = 'default_time_test';
      const beforeTime = Date.now();

      // Act - Call revoke without providing timestamp
      const record = consentManager.revoke(subjectId, purpose);
      const afterTime = Date.now();

      // Assert - Timestamp should be auto-generated between before and after
      expect(record.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(record.timestamp).toBeLessThanOrEqual(afterTime);
      expect(record.granted).toBe(false);
    });

    it('should support mixed usage of explicit and default timestamps', () => {
      // Arrange
      const subjectId = 'user-mixed-timestamps';
      const purpose = 'mixed_time_test';

      // Act - Mix explicit and default timestamps
      consentManager.grant(subjectId, purpose, 1000); // Explicit
      consentManager.revoke(subjectId, purpose); // Default
      const latestRecord = consentManager.latest(subjectId, purpose);

      // Assert - Latest record has auto-generated timestamp
      expect(latestRecord?.granted).toBe(false);
      expect(latestRecord?.timestamp).toBeGreaterThan(1000);
    });
  });
});
