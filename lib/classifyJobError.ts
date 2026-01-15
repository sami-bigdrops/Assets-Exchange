import type { JobErrorType } from '@/types/jobError';

export interface ClassifiedError {
    type: JobErrorType;
    message: string;
    retryable: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export function classifyJobError(error: unknown): ClassifiedError {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('429') || lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
        return {
            type: 'rate_limit',
            message: 'Rate limit exceeded',
            retryable: true,
            severity: 'medium',
        };
    }

    if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out') || lowerMsg.includes('socket hang up') || lowerMsg.includes('504')) {
        return {
            type: 'timeout',
            message: 'Operation timed out',
            retryable: true,
            severity: 'medium',
        };
    }

    if (lowerMsg.includes('network') || lowerMsg.includes('econnrefused') || lowerMsg.includes('dns') || lowerMsg.includes('fetch failed')) {
        return {
            type: 'network',
            message: 'Network error',
            retryable: true,
            severity: 'high',
        };
    }

    if (lowerMsg.includes('500') || lowerMsg.includes('502') || lowerMsg.includes('503') || lowerMsg.includes('bad gateway') || lowerMsg.includes('service unavailable')) {
        return {
            type: 'external_api',
            message: 'External API error',
            retryable: true,
            severity: 'high',
        };
    }

    if (lowerMsg.includes('401') || lowerMsg.includes('403') || lowerMsg.includes('unauthorized') || lowerMsg.includes('forbidden')) {
        return {
            type: 'permission',
            message: 'Permission denied',
            retryable: false,
            severity: 'high',
        };
    }

    if (lowerMsg.includes('validation') || lowerMsg.includes('parse error') || lowerMsg.includes('integrity constraint') || lowerMsg.includes('schema')) {
        return {
            type: 'data_corruption',
            message: 'Data validation or integrity error',
            retryable: false,
            severity: 'critical',
        };
    }

    return {
        type: 'unknown',
        message,
        retryable: true,
        severity: 'medium',
    };
}
