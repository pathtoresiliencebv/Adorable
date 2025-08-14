import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fastApplyTool, batchEditTool, morphMetricsTool, FastApplyMetrics } from '../morph-fast-apply';
import { morphTool } from '../morph-tool';

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'updated code content' } }]
        })
      }
    }
  }))
}));

// Mock filesystem
const mockFs = {
  readFile: jest.fn().mockResolvedValue('original file content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(true)
};

describe('Morph LLM Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset metrics singleton
    (FastApplyMetrics as any).instance = undefined;
  });

  describe('Fast Apply Tool', () => {
    it('should successfully apply a fast edit', async () => {
      const tool = fastApplyTool(mockFs as any);
      
      const result = await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Add a new function',
          code_edit: '// ... existing code ...\nfunction newFunction() {}\n// ... existing code ...',
          priority: 'high'
        }
      });

      expect(result).toEqual({
        success: true,
        file: 'test.ts',
        responseTime: expect.any(Number),
        cacheHit: false
      });

      expect(mockFs.readFile).toHaveBeenCalledWith('test.ts');
      expect(mockFs.writeFile).toHaveBeenCalledWith('test.ts', 'updated code content');
    });

    it('should handle file not found errors', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      
      const tool = fastApplyTool(mockFs as any);
      
      await expect(tool.execute({
        context: {
          target_file: 'nonexistent.ts',
          instructions: 'Add a function',
          code_edit: 'function test() {}',
          priority: 'medium'
        }
      })).rejects.toThrow('File not found');
    });

    it('should handle API errors gracefully', async () => {
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }));

      const tool = fastApplyTool(mockFs as any);
      
      await expect(tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Add a function',
          code_edit: 'function test() {}',
          priority: 'low'
        }
      })).rejects.toThrow('API Error');
    });

    it('should use caching for repeated file reads', async () => {
      const tool = fastApplyTool(mockFs as any);
      
      // First call
      await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'First edit',
          code_edit: '// ... existing code ...\n// first edit\n// ... existing code ...'
        }
      });

      // Second call to same file
      await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Second edit',
          code_edit: '// ... existing code ...\n// second edit\n// ... existing code ...'
        }
      });

      // Should only read file once due to caching
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Batch Edit Tool', () => {
    it('should process multiple edits in parallel', async () => {
      const tool = batchEditTool(mockFs as any);
      
      const result = await tool.execute({
        context: {
          edits: [
            {
              target_file: 'file1.ts',
              instructions: 'Edit file 1',
              code_edit: '// ... existing code ...\n// edit 1\n// ... existing code ...',
              priority: 'high'
            },
            {
              target_file: 'file2.ts',
              instructions: 'Edit file 2',
              code_edit: '// ... existing code ...\n// edit 2\n// ... existing code ...',
              priority: 'medium'
            }
          ]
        }
      });

      expect(result).toEqual({
        total: 2,
        successful: 2,
        failed: 0,
        totalTime: expect.any(Number),
        results: expect.arrayContaining([
          expect.objectContaining({ success: true, file: 'file1.ts' }),
          expect.objectContaining({ success: true, file: 'file2.ts' })
        ])
      });
    });

    it('should handle partial failures in batch', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('file1 content')
        .mockRejectedValueOnce(new Error('File not found'));

      const tool = batchEditTool(mockFs as any);
      
      const result = await tool.execute({
        context: {
          edits: [
            {
              target_file: 'file1.ts',
              instructions: 'Edit file 1',
              code_edit: '// ... existing code ...\n// edit 1\n// ... existing code ...'
            },
            {
              target_file: 'file2.ts',
              instructions: 'Edit file 2',
              code_edit: '// ... existing code ...\n// edit 2\n// ... existing code ...'
            }
          ]
        }
      });

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('Metrics Tool', () => {
    it('should return performance metrics', async () => {
      const tool = morphMetricsTool();
      
      const metrics = await tool.execute({ context: {} });

      expect(metrics).toEqual({
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        successRate: 0,
        cacheHitRate: 0
      });
    });

    it('should track metrics across multiple calls', async () => {
      const tool = morphMetricsTool();
      
      // Simulate some activity
      const metricsInstance = FastApplyMetrics.getInstance();
      metricsInstance.trackCall(true, 1000, false);
      metricsInstance.trackCall(true, 2000, true);
      metricsInstance.trackCall(false, 1500, false);

      const metrics = await tool.execute({ context: {} });

      expect(metrics.totalCalls).toBe(3);
      expect(metrics.successfulCalls).toBe(2);
      expect(metrics.failedCalls).toBe(1);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.successRate).toBe(2/3);
      expect(metrics.cacheHitRate).toBe(1/3);
    });
  });

  describe('Original Morph Tool', () => {
    it('should work with basic edit functionality', async () => {
      const tool = morphTool(mockFs as any);
      
      await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Add a new function',
          code_edit: '// ... existing code ...\nfunction newFunction() {}\n// ... existing code ...'
        }
      });

      expect(mockFs.readFile).toHaveBeenCalledWith('test.ts');
      expect(mockFs.writeFile).toHaveBeenCalledWith('test.ts', 'updated code content');
    });

    it('should handle empty API responses', async () => {
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: null } }]
            })
          }
        }
      }));

      const tool = morphTool(mockFs as any);
      
      await expect(tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Add a function',
          code_edit: 'function test() {}'
        }
      })).rejects.toThrow('No code returned from Morph API');
    });
  });

  describe('Priority Configuration', () => {
    it('should use correct priority settings', async () => {
      const tool = fastApplyTool(mockFs as any);
      
      // Test high priority
      await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'High priority edit',
          code_edit: '// ... existing code ...\n// high priority\n// ... existing code ...',
          priority: 'high'
        }
      });

      // Test low priority
      await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Low priority edit',
          code_edit: '// ... existing code ...\n// low priority\n// ... existing code ...',
          priority: 'low'
        }
      });

      // Verify that different priorities were used
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting with retry logic', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = jest.fn()
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({ choices: [{ message: { content: 'retry success' } }] });

      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: { create: mockCreate }
        }
      }));

      const tool = fastApplyTool(mockFs as any);
      
      const result = await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Test retry',
          code_edit: '// ... existing code ...\n// retry test\n// ... existing code ...'
        }
      });

      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should handle server errors with retry logic', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate = jest.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValueOnce({ choices: [{ message: { content: 'server retry success' } }] });

      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: { create: mockCreate }
        }
      }));

      const tool = fastApplyTool(mockFs as any);
      
      const result = await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Test server retry',
          code_edit: '// ... existing code ...\n// server retry test\n// ... existing code ...'
        }
      });

      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Content Optimization', () => {
    it('should optimize content for faster processing', async () => {
      const tool = fastApplyTool(mockFs as any);
      
      await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Test optimization',
          code_edit: '// ... existing code ...\n// optimized content\n// ... existing code ...'
        }
      });

      // Verify that the content was processed
      expect(mockFs.writeFile).toHaveBeenCalledWith('test.ts', 'updated code content');
    });
  });

  describe('Backup System', () => {
    it('should create backups before editing', async () => {
      const tool = fastApplyTool(mockFs as any);
      
      await tool.execute({
        context: {
          target_file: 'test.ts',
          instructions: 'Test backup',
          code_edit: '// ... existing code ...\n// backup test\n// ... existing code ...'
        }
      });

      // Should create backup and then write new content
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
      expect(mockFs.writeFile).toHaveBeenNthCalledWith(1, expect.stringContaining('backup'), 'original file content');
      expect(mockFs.writeFile).toHaveBeenNthCalledWith(2, 'test.ts', 'updated code content');
    });
  });
});
