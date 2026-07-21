import { beforeEach, describe, expect, test, vi } from 'vitest';

const send = vi.fn();

vi.mock('@aws-sdk/client-cloudformation', () => ({
  CloudFormationClient: vi.fn().mockImplementation(() => ({ send })),
  DescribeStacksCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import ServerlessExportsPlugin from '../src/index';

const describeStacksOutput = {
  Stacks: [
    {
      Outputs: [
        { OutputKey: 'BucketName', OutputValue: 'acme-service-dev-bucket' },
        { OutputKey: 'Foo', OutputValue: 'bar' },
      ],
    },
  ],
};

/**
 * Creates a plugin instance with a fake AWS provider. The provider only
 * implements `getAwsSdkV3Config` when the framework is based on the AWS SDK v3.
 */
const createPlugin = (provider: Record<string, unknown>) => {
  const serverless = {
    service: { custom: { exports: {} }, provider: {} },
    configSchemaHandler: { defineCustomProperties: vi.fn() },
    getProvider: () => ({
      naming: { getStackName: () => 'acme-service-dev' },
      ...provider,
    }),
  };
  const logging = {
    log: {
      notice: vi.fn(),
      verbose: vi.fn(),
      success: vi.fn(),
    },
  };

  type PluginArgs = ConstructorParameters<typeof ServerlessExportsPlugin>;

  return new ServerlessExportsPlugin(
    serverless as unknown as PluginArgs[0],
    {} as unknown as PluginArgs[1],
    logging as unknown as PluginArgs[2],
  );
};

describe('getStackOutputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should use the AWS SDK v3 client when the provider exposes getAwsSdkV3Config', async () => {
    // Arrange
    send.mockResolvedValue(describeStacksOutput);
    const request = vi.fn();
    const plugin = createPlugin({
      getAwsSdkV3Config: () => ({ region: 'us-east-1' }),
      request,
    });

    // Act
    const outputs = await plugin.getStackOutputs();

    // Assert
    expect(outputs).toEqual({
      BucketName: 'acme-service-dev-bucket',
      Foo: 'bar',
    });
    expect(request).not.toHaveBeenCalled();
    expect(vi.mocked(CloudFormationClient).mock.calls[0]).toEqual([
      { region: 'us-east-1' },
    ]);
    expect(vi.mocked(DescribeStacksCommand).mock.calls[0]).toEqual([
      { StackName: 'acme-service-dev' },
    ]);
  });

  test('should fall back to provider.request when getAwsSdkV3Config is missing', async () => {
    // Arrange
    const request = vi.fn().mockResolvedValue(describeStacksOutput);
    const plugin = createPlugin({ request });

    // Act
    const outputs = await plugin.getStackOutputs();

    // Assert
    expect(outputs).toEqual({
      BucketName: 'acme-service-dev-bucket',
      Foo: 'bar',
    });
    expect(send).not.toHaveBeenCalled();
    expect(request.mock.calls[0]).toEqual([
      'CloudFormation',
      'describeStacks',
      { StackName: 'acme-service-dev' },
    ]);
  });

  test('should throw when the stack is not found', async () => {
    // Arrange
    const request = vi.fn().mockResolvedValue({});
    const plugin = createPlugin({ request });

    // Act
    const result = plugin.getStackOutputs();

    // Assert
    await expect(result).rejects.toThrow();
  });
});
