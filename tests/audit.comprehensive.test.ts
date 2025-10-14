/**
 * Comprehensive Audit Ledger Tests
 *
 * Tests compliance with DATA Act requirements:
 * - Section 5(d): Immutable consent timelines and recordkeeping
 * - Section 7(b): Complete access logs (who, what, when, purpose)
 * - Section 12: Mandatory data disclosure by collectors
 * - Section 11: Evidence for civil and criminal penalties
 */

import { AuditLedger, AuditEvent } from '../src/modules/audit/AuditLedger';

describe('AuditLedger - DATA Act Compliance', () => {
  let auditLedger: AuditLedger;

  beforeEach(() => {
    auditLedger = new AuditLedger();
  });

  describe('Section 7(b): Complete Access Logs (Who, What, When, Purpose)', () => {
    it('should log complete audit event with all required fields', () => {
      // Arrange
      const event: AuditEvent = {
        subjectId: 'user-123',
        actor: 'service-authentication',
        action: 'READ',
        resource: 'user-profile',
        timestamp: Date.now(),
        purpose: 'user_authentication'
      };

      // Act
      const loggedEvent = auditLedger.log(event);

      // Assert - All required fields are captured
      expect(loggedEvent.subjectId).toBe(event.subjectId);  // Who (subject)
      expect(loggedEvent.actor).toBe(event.actor);          // Who (actor)
      expect(loggedEvent.action).toBe(event.action);        // What (action)
      expect(loggedEvent.resource).toBe(event.resource);    // What (resource)
      expect(loggedEvent.timestamp).toBe(event.timestamp);  // When
      expect(loggedEvent.purpose).toBe(event.purpose);      // Why (purpose)
    });

    it('should capture actor information for accountability', () => {
      // Arrange
      const actors = [
        'user-self-access',
        'admin-user-john',
        'api-service-analytics',
        'background-job-cleaner',
        'third-party-processor-acme'
      ];

      // Act
      actors.forEach((actor, index) => {
        auditLedger.log({
          subjectId: 'user-456',
          actor: actor,
          action: 'READ',
          resource: 'data-export',
          timestamp: Date.now() + index
        });
      });

      // Assert
      const events = auditLedger.list('user-456');
      expect(events).toHaveLength(actors.length);
      events.forEach((event, index) => {
        expect(event.actor).toBe(actors[index]);
      });
    });

    it('should track all action types as defined by DATA Act', () => {
      // Arrange
      const actions: Array<'READ' | 'WRITE' | 'DELETE' | 'PROCESS'> = [
        'READ',
        'WRITE',
        'DELETE',
        'PROCESS'
      ];

      // Act
      actions.forEach((action, index) => {
        auditLedger.log({
          subjectId: 'user-789',
          actor: 'system',
          action: action,
          resource: 'personal-data',
          timestamp: Date.now() + index
        });
      });

      // Assert - All action types are supported
      const events = auditLedger.list('user-789');
      expect(events).toHaveLength(actions.length);
      actions.forEach((action, index) => {
        expect(events[index].action).toBe(action);
      });
    });

    it('should capture purpose for context and compliance', () => {
      // Arrange
      const purposes = [
        'service_delivery',
        'analytics',
        'marketing',
        'legal_compliance',
        'security_audit',
        'third_party_sharing'
      ];

      // Act
      purposes.forEach((purpose, index) => {
        auditLedger.log({
          subjectId: 'user-purposes',
          actor: 'data-processor',
          action: 'PROCESS',
          resource: 'user-data',
          timestamp: Date.now() + index,
          purpose: purpose
        });
      });

      // Assert
      const events = auditLedger.list('user-purposes');
      events.forEach((event, index) => {
        expect(event.purpose).toBe(purposes[index]);
      });
    });

    it('should log events with optional purpose field', () => {
      // Arrange
      const eventWithoutPurpose: AuditEvent = {
        subjectId: 'user-no-purpose',
        actor: 'system',
        action: 'READ',
        resource: 'metadata',
        timestamp: Date.now()
      };

      // Act
      const logged = auditLedger.log(eventWithoutPurpose);

      // Assert - Purpose is optional but trackable
      expect(logged.purpose).toBeUndefined();
      expect(logged.subjectId).toBe(eventWithoutPurpose.subjectId);
    });
  });

  describe('Section 5(d): Immutable Audit Records', () => {
    it('should maintain immutable audit trail', () => {
      // Arrange
      const originalEvent: AuditEvent = {
        subjectId: 'user-immutable',
        actor: 'service-a',
        action: 'WRITE',
        resource: 'profile',
        timestamp: 1000
      };

      // Act
      auditLedger.log(originalEvent);
      const retrievedEvents = auditLedger.list('user-immutable');

      // Assert - Original event is preserved
      expect(retrievedEvents[0]).toEqual(originalEvent);
    });

    it('should never delete or modify historical audit records', () => {
      // Arrange
      const events: AuditEvent[] = [
        { subjectId: 'user-history', actor: 'svc1', action: 'READ', resource: 'data', timestamp: 1000 },
        { subjectId: 'user-history', actor: 'svc2', action: 'WRITE', resource: 'data', timestamp: 2000 },
        { subjectId: 'user-history', actor: 'svc3', action: 'DELETE', resource: 'data', timestamp: 3000 }
      ];

      // Act
      events.forEach(e => auditLedger.log(e));
      const snapshot1 = auditLedger.list('user-history');

      // Log more events
      auditLedger.log({ subjectId: 'user-history', actor: 'svc4', action: 'READ', resource: 'data', timestamp: 4000 });
      const snapshot2 = auditLedger.list('user-history');

      // Assert - Original events still exist unchanged
      expect(snapshot1).toHaveLength(3);
      expect(snapshot2).toHaveLength(4);
      expect(snapshot2.slice(0, 3)).toEqual(snapshot1);
    });

    it('should preserve complete chronological sequence', () => {
      // Arrange
      const timestamps = [100, 200, 300, 400, 500];

      // Act
      timestamps.forEach(ts => {
        auditLedger.log({
          subjectId: 'user-chrono',
          actor: 'system',
          action: 'PROCESS',
          resource: 'data',
          timestamp: ts
        });
      });

      // Assert
      const events = auditLedger.list('user-chrono');
      expect(events).toHaveLength(timestamps.length);
      events.forEach((event, index) => {
        expect(event.timestamp).toBe(timestamps[index]);
      });
    });

    it('should maintain audit integrity across multiple subjects', () => {
      // Arrange
      const subjects = ['user-a', 'user-b', 'user-c'];

      // Act
      subjects.forEach((subject, index) => {
        auditLedger.log({
          subjectId: subject,
          actor: 'system',
          action: 'READ',
          resource: 'profile',
          timestamp: Date.now() + index
        });
      });

      // Assert - Each subject has independent audit trail
      subjects.forEach(subject => {
        const events = auditLedger.list(subject);
        expect(events).toHaveLength(1);
        expect(events[0].subjectId).toBe(subject);
      });
    });
  });

  describe('Section 12: Mandatory Data Disclosure and Tracking', () => {
    it('should log data access by different recipients/actors', () => {
      // Arrange
      const recipients = [
        'internal-analytics-team',
        'third-party-vendor-acme',
        'marketing-automation-platform',
        'compliance-auditor',
        'legal-team'
      ];

      // Act
      recipients.forEach((recipient, index) => {
        auditLedger.log({
          subjectId: 'user-disclosure',
          actor: recipient,
          action: 'READ',
          resource: 'personal-data',
          timestamp: Date.now() + index,
          purpose: 'data_disclosure'
        });
      });

      // Assert - All disclosures are tracked
      const events = auditLedger.list('user-disclosure');
      expect(events).toHaveLength(recipients.length);
      recipients.forEach((recipient, index) => {
        expect(events[index].actor).toBe(recipient);
      });
    });

    it('should track geographic location of data processing', () => {
      // Arrange - Resource field can include location information
      const locations = [
        'data-center-us-east',
        'cloud-eu-west',
        'processing-asia-pacific',
        'backup-us-west'
      ];

      // Act
      locations.forEach((location, index) => {
        auditLedger.log({
          subjectId: 'user-geo',
          actor: 'data-processor',
          action: 'PROCESS',
          resource: location,
          timestamp: Date.now() + index
        });
      });

      // Assert
      const events = auditLedger.list('user-geo');
      expect(events).toHaveLength(locations.length);
    });

    it('should support querying audit trail for compliance reporting', () => {
      // Arrange
      const subjectId = 'user-compliance-report';
      const events = [
        { actor: 'service-a', action: 'READ' as const, timestamp: 1000 },
        { actor: 'service-b', action: 'WRITE' as const, timestamp: 2000 },
        { actor: 'service-c', action: 'PROCESS' as const, timestamp: 3000 }
      ];

      // Act
      events.forEach(e => {
        auditLedger.log({
          subjectId,
          actor: e.actor,
          action: e.action,
          resource: 'user-data',
          timestamp: e.timestamp
        });
      });

      // Assert - Can generate compliance report
      const auditReport = auditLedger.list(subjectId);
      expect(auditReport.length).toBeGreaterThan(0);
      expect(auditReport).toHaveLength(events.length);
    });
  });

  describe('Section 11: Evidence for Penalties and Litigation', () => {
    it('should provide evidence trail for violation tracking', () => {
      // Arrange - Log potentially violating access
      const violationEvents: AuditEvent[] = [
        {
          subjectId: 'user-violation',
          actor: 'unauthorized-service',
          action: 'READ',
          resource: 'locked-data',
          timestamp: Date.now(),
          purpose: 'unauthorized_access'
        },
        {
          subjectId: 'user-violation',
          actor: 'unauthorized-service',
          action: 'PROCESS',
          resource: 'locked-data',
          timestamp: Date.now() + 1000,
          purpose: 'unauthorized_processing'
        }
      ];

      // Act
      violationEvents.forEach(e => auditLedger.log(e));

      // Assert - Evidence is available for penalty calculation
      const evidence = auditLedger.list('user-violation');
      expect(evidence).toHaveLength(violationEvents.length);

      // Can calculate per-person, per-day violations
      const uniqueDays = new Set(
        evidence.map(e => new Date(e.timestamp).toDateString())
      );
      expect(uniqueDays.size).toBeGreaterThan(0);
    });

    it('should support temporal queries for violation period analysis', () => {
      // Arrange
      const subjectId = 'user-temporal';
      const baseTime = Date.now();

      // Log events across different time periods
      auditLedger.log({ subjectId, actor: 'svc', action: 'READ', resource: 'data', timestamp: baseTime });
      auditLedger.log({ subjectId, actor: 'svc', action: 'WRITE', resource: 'data', timestamp: baseTime + 10000 });
      auditLedger.log({ subjectId, actor: 'svc', action: 'DELETE', resource: 'data', timestamp: baseTime + 20000 });

      // Act - Query events since a specific time
      const recentEvents = auditLedger.since(subjectId, baseTime + 5000);

      // Assert - Only events after threshold are returned
      expect(recentEvents).toHaveLength(2);
      expect(recentEvents.every(e => e.timestamp >= baseTime + 5000)).toBe(true);
    });

    it('should maintain evidence for attorneys fees and injunctive relief', () => {
      // Arrange
      const subjectId = 'user-legal-case';

      // Act - Log pattern of violations
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 3; hour++) {
          auditLedger.log({
            subjectId,
            actor: 'violating-service',
            action: 'READ',
            resource: 'protected-data',
            timestamp: Date.now() + (day * 86400000) + (hour * 3600000)
          });
        }
      }

      // Assert - Complete evidence trail exists
      const evidence = auditLedger.list(subjectId);
      expect(evidence.length).toBeGreaterThan(0);

      // Evidence includes all required fields for legal proceedings
      evidence.forEach(event => {
        expect(event.subjectId).toBeDefined();
        expect(event.actor).toBeDefined();
        expect(event.action).toBeDefined();
        expect(event.resource).toBeDefined();
        expect(event.timestamp).toBeDefined();
      });
    });
  });

  describe('Input Validation and Error Handling', () => {
    it('should reject events with missing subjectId', () => {
      // Arrange
      const invalidEvent = {
        subjectId: '',
        actor: 'service',
        action: 'READ' as const,
        resource: 'data',
        timestamp: Date.now()
      };

      // Act & Assert
      expect(() => auditLedger.log(invalidEvent)).toThrow('Invalid audit event');
    });

    it('should reject events with missing actor', () => {
      // Arrange
      const invalidEvent = {
        subjectId: 'user-123',
        actor: '',
        action: 'READ' as const,
        resource: 'data',
        timestamp: Date.now()
      };

      // Act & Assert
      expect(() => auditLedger.log(invalidEvent)).toThrow('Invalid audit event');
    });

    it('should reject events with missing action', () => {
      // Arrange
      const invalidEvent = {
        subjectId: 'user-123',
        actor: 'service',
        action: '' as any,
        resource: 'data',
        timestamp: Date.now()
      };

      // Act & Assert
      expect(() => auditLedger.log(invalidEvent)).toThrow('Invalid audit event');
    });

    it('should reject events with missing resource', () => {
      // Arrange
      const invalidEvent = {
        subjectId: 'user-123',
        actor: 'service',
        action: 'READ' as const,
        resource: '',
        timestamp: Date.now()
      };

      // Act & Assert
      expect(() => auditLedger.log(invalidEvent)).toThrow('Invalid audit event');
    });

    it('should accept valid events with all required fields', () => {
      // Arrange
      const validEvent: AuditEvent = {
        subjectId: 'user-valid',
        actor: 'valid-service',
        action: 'READ',
        resource: 'valid-resource',
        timestamp: Date.now()
      };

      // Act
      const logged = auditLedger.log(validEvent);

      // Assert
      expect(logged).toEqual(validEvent);
    });
  });

  describe('Query and Retrieval Operations', () => {
    it('should list all events for a specific subject', () => {
      // Arrange
      const targetSubject = 'user-target';
      const otherSubject = 'user-other';

      // Act
      auditLedger.log({ subjectId: targetSubject, actor: 'svc', action: 'READ', resource: 'data', timestamp: 1000 });
      auditLedger.log({ subjectId: otherSubject, actor: 'svc', action: 'READ', resource: 'data', timestamp: 2000 });
      auditLedger.log({ subjectId: targetSubject, actor: 'svc', action: 'WRITE', resource: 'data', timestamp: 3000 });

      // Assert
      const targetEvents = auditLedger.list(targetSubject);
      expect(targetEvents).toHaveLength(2);
      expect(targetEvents.every(e => e.subjectId === targetSubject)).toBe(true);
    });

    it('should return empty array for subject with no events', () => {
      // Arrange
      const subjectId = 'user-no-events';

      // Act
      const events = auditLedger.list(subjectId);

      // Assert
      expect(events).toEqual([]);
      expect(events).toHaveLength(0);
    });

    it('should filter events by timestamp threshold', () => {
      // Arrange
      const subjectId = 'user-time-filter';
      const threshold = 5000;

      // Act
      auditLedger.log({ subjectId, actor: 'svc', action: 'READ', resource: 'data', timestamp: 1000 });
      auditLedger.log({ subjectId, actor: 'svc', action: 'WRITE', resource: 'data', timestamp: 3000 });
      auditLedger.log({ subjectId, actor: 'svc', action: 'DELETE', resource: 'data', timestamp: 6000 });
      auditLedger.log({ subjectId, actor: 'svc', action: 'PROCESS', resource: 'data', timestamp: 8000 });

      // Assert
      const recentEvents = auditLedger.since(subjectId, threshold);
      expect(recentEvents).toHaveLength(2);
      expect(recentEvents.every(e => e.timestamp >= threshold)).toBe(true);
    });

    it('should return all events when threshold is zero', () => {
      // Arrange
      const subjectId = 'user-threshold-zero';

      // Act
      auditLedger.log({ subjectId, actor: 'svc', action: 'READ', resource: 'data', timestamp: 1000 });
      auditLedger.log({ subjectId, actor: 'svc', action: 'WRITE', resource: 'data', timestamp: 2000 });

      // Assert
      const allEvents = auditLedger.since(subjectId, 0);
      expect(allEvents).toHaveLength(2);
    });

    it('should handle timestamp boundary conditions', () => {
      // Arrange
      const subjectId = 'user-boundary';
      const exactTimestamp = 5000;

      // Act
      auditLedger.log({ subjectId, actor: 'svc', action: 'READ', resource: 'data', timestamp: 4999 });
      auditLedger.log({ subjectId, actor: 'svc', action: 'WRITE', resource: 'data', timestamp: 5000 });
      auditLedger.log({ subjectId, actor: 'svc', action: 'DELETE', resource: 'data', timestamp: 5001 });

      // Assert - Threshold is inclusive (>=)
      const events = auditLedger.since(subjectId, exactTimestamp);
      expect(events).toHaveLength(2);
      expect(events[0].timestamp).toBe(5000);
      expect(events[1].timestamp).toBe(5001);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle events with timestamp at epoch zero', () => {
      // Arrange
      const event: AuditEvent = {
        subjectId: 'user-epoch',
        actor: 'system',
        action: 'READ',
        resource: 'data',
        timestamp: 0
      };

      // Act
      auditLedger.log(event);

      // Assert
      const events = auditLedger.list('user-epoch');
      expect(events[0].timestamp).toBe(0);
    });

    it('should handle events with maximum safe integer timestamp', () => {
      // Arrange
      const event: AuditEvent = {
        subjectId: 'user-max-time',
        actor: 'system',
        action: 'READ',
        resource: 'data',
        timestamp: Number.MAX_SAFE_INTEGER
      };

      // Act
      auditLedger.log(event);

      // Assert
      const events = auditLedger.list('user-max-time');
      expect(events[0].timestamp).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very long string values in fields', () => {
      // Arrange
      const longString = 'x'.repeat(10000);
      const event: AuditEvent = {
        subjectId: longString,
        actor: longString,
        action: 'READ',
        resource: longString,
        timestamp: Date.now()
      };

      // Act
      const logged = auditLedger.log(event);

      // Assert
      expect(logged.subjectId).toBe(longString);
      expect(logged.actor).toBe(longString);
      expect(logged.resource).toBe(longString);
    });

    it('should handle special characters in string fields', () => {
      // Arrange
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const event: AuditEvent = {
        subjectId: `user-${specialChars}`,
        actor: `actor-${specialChars}`,
        action: 'READ',
        resource: `resource-${specialChars}`,
        timestamp: Date.now()
      };

      // Act
      const logged = auditLedger.log(event);

      // Assert
      expect(logged.subjectId).toContain(specialChars);
      expect(logged.actor).toContain(specialChars);
      expect(logged.resource).toContain(specialChars);
    });

    it('should handle Unicode characters in fields', () => {
      // Arrange
      const unicodeEvent: AuditEvent = {
        subjectId: 'user-中文-العربية-한국어',
        actor: 'актор-🔒',
        action: 'READ',
        resource: 'データ-📊',
        timestamp: Date.now()
      };

      // Act
      const logged = auditLedger.log(unicodeEvent);

      // Assert
      expect(logged.subjectId).toBe(unicodeEvent.subjectId);
      expect(logged.actor).toBe(unicodeEvent.actor);
      expect(logged.resource).toBe(unicodeEvent.resource);
    });
  });

  describe('Performance and Scalability', () => {
    it('should efficiently log large volumes of events', () => {
      // Arrange
      const eventCount = 10000;
      const subjectId = 'user-volume';

      // Act
      const startTime = Date.now();
      for (let i = 0; i < eventCount; i++) {
        auditLedger.log({
          subjectId,
          actor: `service-${i % 10}`,
          action: (['READ', 'WRITE', 'DELETE', 'PROCESS'] as const)[i % 4],
          resource: 'data',
          timestamp: Date.now() + i
        });
      }
      const logTime = Date.now() - startTime;

      // Assert
      expect(logTime).toBeLessThan(2000); // Should complete in < 2 seconds
      expect(auditLedger.list(subjectId)).toHaveLength(eventCount);
    });

    it('should efficiently query large audit trails', () => {
      // Arrange
      const subjectId = 'user-query-perf';
      for (let i = 0; i < 5000; i++) {
        auditLedger.log({
          subjectId,
          actor: 'system',
          action: 'READ',
          resource: 'data',
          timestamp: i * 1000
        });
      }

      // Act
      const startTime = Date.now();
      const events = auditLedger.list(subjectId);
      const queryTime = Date.now() - startTime;

      // Assert
      expect(queryTime).toBeLessThan(100); // Should be very fast
      expect(events).toHaveLength(5000);
    });

    it('should efficiently filter by timestamp on large datasets', () => {
      // Arrange
      const subjectId = 'user-filter-perf';
      for (let i = 0; i < 5000; i++) {
        auditLedger.log({
          subjectId,
          actor: 'system',
          action: 'PROCESS',
          resource: 'data',
          timestamp: i * 1000
        });
      }

      // Act
      const startTime = Date.now();
      const filtered = auditLedger.since(subjectId, 2500000);
      const filterTime = Date.now() - startTime;

      // Assert
      expect(filterTime).toBeLessThan(100);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(e => e.timestamp >= 2500000)).toBe(true);
    });

    it('should handle multiple subjects with large event volumes', () => {
      // Arrange
      const subjectCount = 100;
      const eventsPerSubject = 100;

      // Act
      const startTime = Date.now();
      for (let s = 0; s < subjectCount; s++) {
        for (let e = 0; e < eventsPerSubject; e++) {
          auditLedger.log({
            subjectId: `user-${s}`,
            actor: 'system',
            action: 'READ',
            resource: 'data',
            timestamp: Date.now() + e
          });
        }
      }
      const totalTime = Date.now() - startTime;

      // Assert
      expect(totalTime).toBeLessThan(2000);

      // Verify data integrity
      const sampleEvents = auditLedger.list('user-0');
      expect(sampleEvents).toHaveLength(eventsPerSubject);
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain event order within subject context', () => {
      // Arrange
      const subjectId = 'user-order';
      const timestamps = [1000, 2000, 3000, 4000, 5000];

      // Act
      timestamps.forEach(ts => {
        auditLedger.log({
          subjectId,
          actor: 'system',
          action: 'READ',
          resource: 'data',
          timestamp: ts
        });
      });

      // Assert
      const events = auditLedger.list(subjectId);
      expect(events[0].timestamp).toBe(1000);
      expect(events[4].timestamp).toBe(5000);
    });

    it('should not leak events between different subjects', () => {
      // Arrange
      const subject1 = 'user-isolation-1';
      const subject2 = 'user-isolation-2';

      // Act
      auditLedger.log({ subjectId: subject1, actor: 'svc', action: 'READ', resource: 'data', timestamp: 1000 });
      auditLedger.log({ subjectId: subject2, actor: 'svc', action: 'WRITE', resource: 'data', timestamp: 2000 });

      // Assert
      const events1 = auditLedger.list(subject1);
      const events2 = auditLedger.list(subject2);

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events1[0].subjectId).toBe(subject1);
      expect(events2[0].subjectId).toBe(subject2);
    });

    it('should preserve all event fields without corruption', () => {
      // Arrange
      const originalEvent: AuditEvent = {
        subjectId: 'user-preservation',
        actor: 'critical-service',
        action: 'DELETE',
        resource: 'sensitive-data',
        timestamp: 123456789,
        purpose: 'data_retention_policy'
      };

      // Act
      auditLedger.log(originalEvent);
      const retrieved = auditLedger.list('user-preservation')[0];

      // Assert - All fields preserved exactly
      expect(retrieved).toEqual(originalEvent);
    });
  });

  describe('Compliance Reporting Features', () => {
    it('should support comprehensive compliance audit generation', () => {
      // Arrange
      const subjectId = 'user-compliance-full';
      const reportPeriod = Date.now();

      // Create diverse audit trail
      const eventTypes = [
        { actor: 'user-self', action: 'READ' as const, purpose: 'self_access' },
        { actor: 'admin', action: 'WRITE' as const, purpose: 'data_correction' },
        { actor: 'analytics-service', action: 'PROCESS' as const, purpose: 'analytics' },
        { actor: 'third-party', action: 'READ' as const, purpose: 'third_party_sharing' },
        { actor: 'compliance-officer', action: 'READ' as const, purpose: 'audit' }
      ];

      // Act
      eventTypes.forEach((eventType, index) => {
        auditLedger.log({
          subjectId,
          actor: eventType.actor,
          action: eventType.action,
          resource: 'personal-data',
          timestamp: reportPeriod + (index * 1000),
          purpose: eventType.purpose
        });
      });

      // Assert - Complete audit report available
      const auditReport = auditLedger.list(subjectId);
      expect(auditReport).toHaveLength(eventTypes.length);

      // Verify report completeness
      auditReport.forEach(event => {
        expect(event.subjectId).toBeDefined();
        expect(event.actor).toBeDefined();
        expect(event.action).toBeDefined();
        expect(event.resource).toBeDefined();
        expect(event.timestamp).toBeDefined();
      });
    });

    it('should support time-range queries for periodic reporting', () => {
      // Arrange
      const subjectId = 'user-periodic-report';
      const dayInMs = 86400000;
      const now = Date.now();

      // Create events over multiple days
      for (let day = 0; day < 30; day++) {
        auditLedger.log({
          subjectId,
          actor: 'daily-processor',
          action: 'PROCESS',
          resource: 'data',
          timestamp: now + (day * dayInMs)
        });
      }

      // Act - Generate report for last 7 days
      const last7Days = auditLedger.since(subjectId, now + (23 * dayInMs));

      // Assert
      expect(last7Days.length).toBeGreaterThan(0);
      expect(last7Days.length).toBeLessThanOrEqual(7);
    });
  });
});
