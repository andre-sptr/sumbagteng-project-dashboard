// Unit tests for project-specific calculations and status classification
import { describe, it, expect } from 'vitest';
import {
  classifyStatus,
  parseNumber,
  getPortCount,
  isGoliveTimelineStatus,
} from '@/utils/project';

describe('Project Utilities', () => {
  describe('classifyStatus', () => {
    it('should classify "1. Planning" as progress', () => {
      expect(classifyStatus('1. Planning')).toBe('progress');
    });

    it('should classify "7. Done" as done', () => {
      expect(classifyStatus('7. Done')).toBe('done');
    });

    it('should classify "CANCELLED" as cancelled', () => {
      expect(classifyStatus('CANCELLED')).toBe('cancelled');
    });

    it('should classify unknown as other', () => {
      expect(classifyStatus('Unknown')).toBe('other');
    });
  });

  describe('parseNumber', () => {
    it('should parse valid numbers', () => {
      expect(parseNumber('123')).toBe(123);
      expect(parseNumber(123)).toBe(123);
    });

    it('should return 0 for invalid inputs', () => {
      expect(parseNumber('')).toBe(0);
      expect(parseNumber(null)).toBe(0);
      expect(parseNumber('abc')).toBe(0);
    });
  });

  describe('getPortCount', () => {
    it('should return real ports if available', () => {
      const fd = new Array(32).fill(0);
      fd[10] = 100; // PORT PLAN (COL.PORT_PLAN)
      fd[30] = 120; // REAL JML PORT GOLIVE (COL.REAL_JML_PORT_GOLIVE)
      expect(getPortCount(fd)).toBe(120);
    });

    it('should return plan ports if real is 0', () => {
      const fd = new Array(32).fill(0);
      fd[10] = 100; // PORT PLAN
      fd[30] = 0;   // REAL JML PORT GOLIVE
      expect(getPortCount(fd)).toBe(100);
    });
  });

  describe('isGoliveTimelineStatus', () => {
    it('should include only numbered GOLIVE and UJI TERIMA statuses', () => {
      expect(isGoliveTimelineStatus('7. GOLIVE')).toBe(true);
      expect(isGoliveTimelineStatus('8. UJI TERIMA')).toBe(true);
      expect(isGoliveTimelineStatus('7. Done')).toBe(false);
      expect(isGoliveTimelineStatus('GOLIVE')).toBe(false);
      expect(isGoliveTimelineStatus('complete')).toBe(false);
    });
  });
});
