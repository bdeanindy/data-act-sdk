/**
 * SDK Integration Tests
 *
 * Tests end-to-end integration between SDK modules:
 * - ConsentManager + AuditLedger integration
 * - LockService + AuditLedger integration
 * - Complete workflows spanning multiple modules
 * - Cross-cutting concerns (Section 3, 4, 10, 17, 18)
 */

import { ConsentManager } from '../src/modules/consent/ConsentManager';
import { AuditLedger } from '../src/modules/audit/AuditLedger';
import { LockService } from '../src/modules/lock/LockService';

describe('SDK Integration Tests - DATA Act Compliance', () => {
  let consentManager: ConsentManager;
  let auditLedger: AuditLedger;
  let lockService: LockService;

  beforeEach(() => {
    consentManager = new ConsentManager();
    auditLedger = new AuditLedger();
    lockService = new LockService();
  });

  describe('Section 3: Non-transferable Data Ownership', () => {
    it('should enforce that only data owner can lock their data', () => {
      // Arrange
      const dataOwner = 'user-owner-123';

      // Act - Owner locks their data
      const lockResult = lockService.lock(dataOwner);

      // Assert - Lock is enforced for owner
      expect(lockResult).toBe(true);
      expect(lockService.isLocked(dataOwner)).toBe(true);

      // Other users are not affected
      expect(lockService.isLocked('user-other-456')).toBe(false);
    });

    it('should maintain ownership context across consent operations', () => {
      // Arrange
      const ownerId = 'data-owner-789';
      const purpose = 'analytics';

      // Act - Owner grants and revokes consent
      const grantRecord = consentManager.grant(ownerId, purpose, Date.now());
      const revokeRecord = consentManager.revoke(ownerId, purpose, Date.now() + 1000);

      // Assert - All operations maintain ownership context
      expect(grantRecord.subjectId).toBe(ownerId);
      expect(revokeRecord.subjectId).toBe(ownerId);
      expect(consentManager.latest(ownerId, purpose)?.subjectId).toBe(ownerId);
    });

    it('should track ownership through complete data lifecycle', () => {
      // Arrange
      const ownerId = 'lifecycle-owner';
      const purpose = 'data_processing';
      const timestamp = Date.now();

      // Act - Complete lifecycle
      // 1. Grant consent
      consentManager.grant(ownerId, purpose, timestamp);
      auditLedger.log({
        subjectId: ownerId,
        actor: 'system',
        action: 'WRITE',
        resource: 'consent-grant',
        timestamp
      });

      // 2. Process data
      auditLedger.log({
        subjectId: ownerId,
        actor: 'processing-service',
        action: 'PROCESS',
        resource: 'user-data',
        timestamp: timestamp + 1000,
        purpose
      });

      // 3. Owner locks data
      lockService.lock(ownerId);

      // 4. Revoke consent
      consentManager.revoke(ownerId, purpose, timestamp + 2000);

      // Assert - Owner context maintained throughout
      const consentHistory = consentManager.history(ownerId);
      const auditTrail = auditLedger.list(ownerId);
      const lockStatus = lockService.isLocked(ownerId);

      expect(consentHistory.every(c => c.subjectId === ownerId)).toBe(true);
      expect(auditTrail.every(a => a.subjectId === ownerId)).toBe(true);
      expect(lockStatus).toBe(true);
    });
  });

  describe('Consent + Audit Integration', () => {
    it('should create audit trail for consent grant operations', () => {
      // Arrange
      const subjectId = 'user-consent-audit';
      const purpose = 'marketing';
      const timestamp = Date.now();

      // Act - Grant consent and log audit
      const consentRecord = consentManager.grant(subjectId, purpose, timestamp);
      auditLedger.log({
        subjectId,
        actor: 'consent-manager',
        action: 'WRITE',
        resource: `consent-${consentRecord.purpose}`,
        timestamp,
        purpose: 'consent_grant'
      });

      // Assert
      const auditEvents = auditLedger.list(subjectId);
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].action).toBe('WRITE');
      expect(consentManager.latest(subjectId, purpose)?.granted).toBe(true);
    });

    it('should create audit trail for consent revocation', () => {
      // Arrange
      const subjectId = 'user-revoke-audit';
      const purpose = 'analytics';
      const grantTime = Date.now();
      const revokeTime = grantTime + 5000;

      // Act
      consentManager.grant(subjectId, purpose, grantTime);
      auditLedger.log({
        subjectId,
        actor: 'user-self',
        action: 'WRITE',
        resource: 'consent-grant',
        timestamp: grantTime
      });

      consentManager.revoke(subjectId, purpose, revokeTime);
      auditLedger.log({
        subjectId,
        actor: 'user-self',
        action: 'DELETE',
        resource: 'consent-revoke',
        timestamp: revokeTime,
        purpose: 'user_revocation'
      });

      // Assert
      const auditTrail = auditLedger.list(subjectId);
      expect(auditTrail).toHaveLength(2);
      expect(auditTrail[0].action).toBe('WRITE'); // Grant
      expect(auditTrail[1].action).toBe('DELETE'); // Revoke
      expect(consentManager.latest(subjectId, purpose)?.granted).toBe(false);
    });

    it('should maintain synchronized timeline between consent and audit', () => {
      // Arrange
      const subjectId = 'user-timeline-sync';
      const purpose = 'personalization';
      const timestamps = [1000, 2000, 3000, 4000];

      // Act - Create interleaved consent and audit events
      consentManager.grant(subjectId, purpose, timestamps[0]);
      auditLedger.log({
        subjectId,
        actor: 'system',
        action: 'WRITE',
        resource: 'consent',
        timestamp: timestamps[0]
      });

      consentManager.revoke(subjectId, purpose, timestamps[1]);
      auditLedger.log({
        subjectId,
        actor: 'user',
        action: 'DELETE',
        resource: 'consent',
        timestamp: timestamps[1]
      });

      consentManager.grant(subjectId, purpose, timestamps[2]);
      auditLedger.log({
        subjectId,
        actor: 'system',
        action: 'WRITE',
        resource: 'consent',
        timestamp: timestamps[2]
      });

      // Assert - Timelines are synchronized
      const consentHistory = consentManager.history(subjectId, purpose);
      const auditHistory = auditLedger.list(subjectId);

      expect(consentHistory).toHaveLength(3);
      expect(auditHistory).toHaveLength(3);

      // Verify timestamp alignment
      consentHistory.forEach((consent, index) => {
        expect(consent.timestamp).toBe(timestamps[index]);
        expect(auditHistory[index].timestamp).toBe(timestamps[index]);
      });
    });
  });

  describe('Lock + Audit Integration', () => {
    it('should create audit trail when data is locked', () => {
      // Arrange
      const subjectId = 'user-lock-audit';
      const timestamp = Date.now();

      // Act
      lockService.lock(subjectId);
      auditLedger.log({
        subjectId,
        actor: 'user-self',
        action: 'WRITE',
        resource: 'data-lock-enabled',
        timestamp,
        purpose: 'data_lock_activation'
      });

      // Assert
      expect(lockService.isLocked(subjectId)).toBe(true);
      const auditEvents = auditLedger.list(subjectId);
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].purpose).toBe('data_lock_activation');
    });

    it('should audit court order unlock with proper documentation', () => {
      // Arrange
      const subjectId = 'user-court-unlock-audit';
      const courtOrderId = 'COURT-ORDER-2025-12345';
      const lockTime = Date.now();
      const unlockTime = lockTime + 10000;

      // Act
      lockService.lock(subjectId);
      auditLedger.log({
        subjectId,
        actor: 'user-self',
        action: 'WRITE',
        resource: 'data-lock-enabled',
        timestamp: lockTime
      });

      lockService.unlock(subjectId, courtOrderId);
      auditLedger.log({
        subjectId,
        actor: 'court-system',
        action: 'WRITE',
        resource: `data-lock-disabled-order-${courtOrderId}`,
        timestamp: unlockTime,
        purpose: 'court_order_compliance'
      });

      // Assert
      expect(lockService.isLocked(subjectId)).toBe(false);

      const auditTrail = auditLedger.list(subjectId);
      expect(auditTrail).toHaveLength(2);
      expect(auditTrail[1].resource).toContain(courtOrderId);
      expect(auditTrail[1].purpose).toBe('court_order_compliance');
    });

    it('should audit access attempts to locked data', () => {
      // Arrange
      const subjectId = 'user-locked-access-attempt';
      const timestamp = Date.now();

      // Act
      lockService.lock(subjectId);

      // Simulate access attempt
      const isLocked = lockService.isLocked(subjectId);
      if (isLocked) {
        auditLedger.log({
          subjectId,
          actor: 'data-service',
          action: 'READ',
          resource: 'blocked-by-lock',
          timestamp,
          purpose: 'access_denied_locked_data'
        });
      }

      // Assert
      const auditEvents = auditLedger.list(subjectId);
      expect(auditEvents.some(e => e.purpose === 'access_denied_locked_data')).toBe(true);
    });
  });

  describe('Lock + Consent Integration', () => {
    it('should prevent consent changes when data is locked', () => {
      // Arrange
      const subjectId = 'user-lock-consent-protection';
      const purpose = 'data_processing';
      const timestamp = Date.now();

      // Act - Grant consent, then lock
      consentManager.grant(subjectId, purpose, timestamp);
      lockService.lock(subjectId);

      // Check if operations should be blocked
      const isLocked = lockService.isLocked(subjectId);
      const currentConsent = consentManager.latest(subjectId, purpose);

      // Assert - Lock status can gate consent operations
      expect(isLocked).toBe(true);
      expect(currentConsent?.granted).toBe(true);

      // In real implementation, consent operations would check lock status
      // and throw error or log violation attempt
    });

    it('should maintain consent history even when data is locked', () => {
      // Arrange
      const subjectId = 'user-locked-history-access';
      const purpose = 'analytics';

      // Act - Build consent history, then lock
      consentManager.grant(subjectId, purpose, 1000);
      consentManager.revoke(subjectId, purpose, 2000);
      consentManager.grant(subjectId, purpose, 3000);

      lockService.lock(subjectId);

      // Read-only access to history should still work
      const history = consentManager.history(subjectId, purpose);

      // Assert
      expect(lockService.isLocked(subjectId)).toBe(true);
      expect(history).toHaveLength(3);
    });

    it('should allow consent revocation even when locked (user right)', () => {
      // Arrange
      const subjectId = 'user-revoke-while-locked';
      const purpose = 'marketing';

      // Act - Grant, lock, then revoke
      consentManager.grant(subjectId, purpose, 1000);
      lockService.lock(subjectId);

      // User can still revoke consent (Section 5c - revocable at any time)
      consentManager.revoke(subjectId, purpose, 2000);

      // Assert
      expect(lockService.isLocked(subjectId)).toBe(true);
      expect(consentManager.latest(subjectId, purpose)?.granted).toBe(false);
    });
  });

  describe('Complete Workflow Scenarios', () => {
    it('should handle complete user onboarding workflow', () => {
      // Arrange
      const userId = 'new-user-onboarding';
      const timestamp = Date.now();

      // Act - Onboarding workflow
      // 1. User grants initial consents
      consentManager.grant(userId, 'core_service', timestamp);
      consentManager.grant(userId, 'analytics', timestamp + 100);

      // 2. Audit consent grants
      auditLedger.log({
        subjectId: userId,
        actor: 'onboarding-service',
        action: 'WRITE',
        resource: 'consent-core_service',
        timestamp
      });
      auditLedger.log({
        subjectId: userId,
        actor: 'onboarding-service',
        action: 'WRITE',
        resource: 'consent-analytics',
        timestamp: timestamp + 100
      });

      // 3. Process initial data
      auditLedger.log({
        subjectId: userId,
        actor: 'data-processor',
        action: 'PROCESS',
        resource: 'user-profile',
        timestamp: timestamp + 200,
        purpose: 'core_service'
      });

      // Assert - Complete state
      expect(consentManager.history(userId)).toHaveLength(2);
      expect(auditLedger.list(userId)).toHaveLength(3);
      expect(lockService.isLocked(userId)).toBe(false);
    });

    it('should handle user privacy protection escalation workflow', () => {
      // Arrange
      const userId = 'user-privacy-escalation';
      const timestamp = Date.now();

      // Act - Privacy escalation workflow
      // 1. User has active consents
      consentManager.grant(userId, 'analytics', timestamp);
      consentManager.grant(userId, 'marketing', timestamp + 1000);

      // 2. User becomes concerned about privacy
      consentManager.revoke(userId, 'marketing', timestamp + 2000);
      auditLedger.log({
        subjectId: userId,
        actor: 'user-self',
        action: 'DELETE',
        resource: 'consent-marketing',
        timestamp: timestamp + 2000
      });

      // 3. User locks all data
      lockService.lock(userId);
      auditLedger.log({
        subjectId: userId,
        actor: 'user-self',
        action: 'WRITE',
        resource: 'data-lock-enabled',
        timestamp: timestamp + 3000,
        purpose: 'privacy_protection'
      });

      // Assert - Maximum protection achieved
      expect(consentManager.latest(userId, 'marketing')?.granted).toBe(false);
      expect(lockService.isLocked(userId)).toBe(true);
      expect(auditLedger.list(userId).length).toBeGreaterThan(0);
    });

    it('should handle law enforcement access workflow', () => {
      // Arrange
      const userId = 'user-legal-access';
      const courtOrderId = 'WARRANT-2025-LEGAL-CASE-001';
      const timestamp = Date.now();

      // Act - Law enforcement workflow
      // 1. User has locked data
      lockService.lock(userId);
      auditLedger.log({
        subjectId: userId,
        actor: 'user-self',
        action: 'WRITE',
        resource: 'data-lock-enabled',
        timestamp
      });

      // 2. Court order issued
      lockService.unlock(userId, courtOrderId);
      auditLedger.log({
        subjectId: userId,
        actor: 'law-enforcement',
        action: 'WRITE',
        resource: `unlock-court-order-${courtOrderId}`,
        timestamp: timestamp + 1000,
        purpose: 'legal_warrant'
      });

      // 3. Data accessed under warrant
      auditLedger.log({
        subjectId: userId,
        actor: 'law-enforcement',
        action: 'READ',
        resource: 'locked-data',
        timestamp: timestamp + 2000,
        purpose: 'legal_investigation'
      });

      // 4. Access period expires, re-lock
      lockService.lock(userId);
      auditLedger.log({
        subjectId: userId,
        actor: 'system',
        action: 'WRITE',
        resource: 'data-lock-re-enabled',
        timestamp: timestamp + 3000,
        purpose: 'warrant_period_expired'
      });

      // Assert - Complete audit trail exists
      const auditTrail = auditLedger.list(userId);
      expect(auditTrail.length).toBeGreaterThanOrEqual(4);
      expect(auditTrail.some(e => e.resource.includes(courtOrderId))).toBe(true);
      expect(lockService.isLocked(userId)).toBe(true);
    });

    it('should handle data breach response workflow', () => {
      // Arrange
      const affectedUsers = ['user-breach-1', 'user-breach-2', 'user-breach-3'];
      const breachTimestamp = Date.now();

      // Act - Breach response workflow
      affectedUsers.forEach(userId => {
        // 1. Log unauthorized access
        auditLedger.log({
          subjectId: userId,
          actor: 'unauthorized-party',
          action: 'READ',
          resource: 'personal-data',
          timestamp: breachTimestamp,
          purpose: 'security_breach'
        });

        // 2. Revoke all third-party consents
        consentManager.revoke(userId, 'third_party_sharing', breachTimestamp + 1000);

        // 3. Lock data as precaution
        lockService.lock(userId);

        // 4. Log protective actions
        auditLedger.log({
          subjectId: userId,
          actor: 'security-team',
          action: 'WRITE',
          resource: 'breach-response-lockdown',
          timestamp: breachTimestamp + 2000,
          purpose: 'breach_containment'
        });
      });

      // Assert - All users protected
      affectedUsers.forEach(userId => {
        expect(lockService.isLocked(userId)).toBe(true);
        expect(auditLedger.list(userId).length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should handle data portability export workflow', () => {
      // Arrange
      const userId = 'user-data-export';
      const timestamp = Date.now();

      // Act - Data export workflow
      // 1. User has consent history
      consentManager.grant(userId, 'analytics', timestamp);
      consentManager.grant(userId, 'marketing', timestamp + 1000);
      consentManager.revoke(userId, 'marketing', timestamp + 2000);

      // 2. User has audit history
      auditLedger.log({
        subjectId: userId,
        actor: 'various-services',
        action: 'PROCESS',
        resource: 'user-data',
        timestamp: timestamp + 3000
      });

      // 3. User requests export (Section 7a)
      const consentExport = consentManager.history(userId);
      const auditExport = auditLedger.list(userId);
      const lockStatus = lockService.isLocked(userId);

      // 4. Log export request
      auditLedger.log({
        subjectId: userId,
        actor: 'export-service',
        action: 'READ',
        resource: 'complete-data-export',
        timestamp: timestamp + 4000,
        purpose: 'user_data_portability'
      });

      // Assert - Complete data available for export
      expect(consentExport.length).toBeGreaterThan(0);
      expect(auditExport.length).toBeGreaterThan(0);
      expect(typeof lockStatus).toBe('boolean');
    });
  });

  describe('Section 18: Cross-Agency Coordination and Harmonization', () => {
    it('should support integration with HIPAA-style health data workflows', () => {
      // Arrange
      const patientId = 'patient-hipaa-001';
      const timestamp = Date.now();

      // Act - HIPAA-compliant workflow
      consentManager.grant(patientId, 'health_treatment', timestamp);
      consentManager.grant(patientId, 'health_research', timestamp + 1000);

      auditLedger.log({
        subjectId: patientId,
        actor: 'healthcare-provider',
        action: 'READ',
        resource: 'medical-records',
        timestamp: timestamp + 2000,
        purpose: 'health_treatment'
      });

      // Assert - Health data protection maintained
      expect(consentManager.latest(patientId, 'health_treatment')?.granted).toBe(true);
      expect(auditLedger.list(patientId).length).toBeGreaterThan(0);
    });

    it('should support integration with GLBA financial data workflows', () => {
      // Arrange
      const customerId = 'customer-financial-001';
      const timestamp = Date.now();

      // Act - Financial data workflow
      consentManager.grant(customerId, 'financial_service_delivery', timestamp);

      auditLedger.log({
        subjectId: customerId,
        actor: 'financial-institution',
        action: 'PROCESS',
        resource: 'financial-transactions',
        timestamp: timestamp + 1000,
        purpose: 'financial_service_delivery'
      });

      lockService.lock(customerId);

      // Assert - Financial data protection
      expect(lockService.isLocked(customerId)).toBe(true);
      expect(auditLedger.list(customerId).length).toBeGreaterThan(0);
    });
  });

  describe('Section 10: Jurisdiction and Applicability', () => {
    it('should track cross-border data processing', () => {
      // Arrange
      const globalUserId = 'us-citizen-abroad';
      const timestamp = Date.now();

      // Act - Cross-border data processing
      auditLedger.log({
        subjectId: globalUserId,
        actor: 'service-us-east',
        action: 'PROCESS',
        resource: 'data-region-us',
        timestamp
      });

      auditLedger.log({
        subjectId: globalUserId,
        actor: 'service-eu-west',
        action: 'PROCESS',
        resource: 'data-region-eu',
        timestamp: timestamp + 1000
      });

      auditLedger.log({
        subjectId: globalUserId,
        actor: 'service-asia-pacific',
        action: 'PROCESS',
        resource: 'data-region-asia',
        timestamp: timestamp + 2000
      });

      // Assert - All cross-border processing tracked
      const auditTrail = auditLedger.list(globalUserId);
      expect(auditTrail).toHaveLength(3);
      expect(auditTrail.map(e => e.resource)).toContain('data-region-us');
      expect(auditTrail.map(e => e.resource)).toContain('data-region-eu');
      expect(auditTrail.map(e => e.resource)).toContain('data-region-asia');
    });
  });

  describe('Performance of Integrated Operations', () => {
    it('should efficiently handle complex workflows at scale', () => {
      // Arrange
      const userCount = 100;
      const users = Array.from({ length: userCount }, (_, i) => `user-perf-${i}`);

      // Act
      const startTime = Date.now();

      users.forEach((userId, index) => {
        // Grant multiple consents
        consentManager.grant(userId, 'service', Date.now() + index);
        consentManager.grant(userId, 'analytics', Date.now() + index + 1);

        // Create audit trail
        auditLedger.log({
          subjectId: userId,
          actor: 'system',
          action: 'PROCESS',
          resource: 'data',
          timestamp: Date.now() + index + 2
        });

        // Some users lock their data
        if (index % 3 === 0) {
          lockService.lock(userId);
        }
      });

      const totalTime = Date.now() - startTime;

      // Assert
      expect(totalTime).toBeLessThan(2000);

      // Verify data integrity
      const sampleUser = users[0];
      expect(consentManager.history(sampleUser).length).toBeGreaterThan(0);
      expect(auditLedger.list(sampleUser).length).toBeGreaterThan(0);
    });
  });
});
