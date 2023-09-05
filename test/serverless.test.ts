import cloudFormationSchema from '@serverless/utils/cloudformation-schema';
import { $ } from "execa";
import fs from "fs";
import yaml from 'js-yaml';
import path from "path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import type { ExportsConfig } from "../src/config";

// TODO tests for:
// other formats (json, yaml, toml)
// invalid config

const baseConfigFile = path.join(__dirname, "..", "serverless.yml");
const serverlessDir = path.join(__dirname, "..", ".serverless");

const removeDir = (dir: string) => {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true });
	}
};

const removeFiles = (...files: string[]) => {
	files.forEach((file) => fs.existsSync(file) && fs.rmSync(file));
};

type Export = {
	format: string;
	envFile: string;
	stackFile: string;
	envSnapshot: string[];
	stackSnapshot: string[];
};

const exports: Array<Export> = [
	{
		format: "env",
		envFile: path.join(serverlessDir, "env-variables.env"),
		stackFile: path.join(serverlessDir, "stack-outputs.env"),
		envSnapshot: [
			"FOO=bar",
			"STAGE=dev",
			"REGION=us-east-1",
			"SERVICE=acme-service",
		],
		stackSnapshot: [
			expect.stringContaining(
				"ServerlessDeploymentBucketName=acme-service-dev-serverlessdeploymentbuck",
			),
			expect.stringContaining(
				"HelloLambdaFunctionQualifiedArn=arn:aws:lambda:us-east-1:000000000000:function:acme-service-dev-hello:",
			),
			"Foo=bar",
			"BucketName=acme-service-dev-bucket",
		],
	},
	{
		format: "yml",
		envFile: path.join(serverlessDir, "env-variables.yml"),
		stackFile: path.join(serverlessDir, "stack-outputs.yml"),
		envSnapshot: [
			"FOO: bar",
			"STAGE: dev",
			"REGION: us-east-1",
			"SERVICE: acme-service",
		],
		stackSnapshot: [
			expect.stringContaining(
				"ServerlessDeploymentBucketName: acme-service-dev-serverlessdeploymentbuck",
			),
			expect.stringContaining(
				"HelloLambdaFunctionQualifiedArn: arn:aws:lambda:us-east-1:000000000000:function:acme-service-dev-hello:",
			),
			"Foo: bar",
			"BucketName: acme-service-dev-bucket",
		],
	},
];

type ServerlessConfig = {
	custom: ExportsConfig;
};

const readServerlessConfig = (configFile: string): ServerlessConfig => {
	return yaml.load(fs.readFileSync(configFile, 'utf-8'), {
		schema: cloudFormationSchema,
	});
};

const writeServerlessConfig = (configFile: string, config: ServerlessConfig) => {
	const content = yaml.dump(config, {
		schema: cloudFormationSchema,
	});
	fs.writeFileSync(configFile, content, 'utf-8');
};

beforeAll(() => {
	removeDir(serverlessDir);

	return () => { removeDir(serverlessDir); }
});

describe.each(exports)("format: $format", ({ format, envFile, stackFile, envSnapshot, stackSnapshot }) => {
	let configFile: string;

	beforeAll(() => {
		// create temporary serverless config file inside the root directory
		const config = readServerlessConfig(baseConfigFile);
		config.custom.exports = {
			environment: {
				format,
				file: envFile,
				overwrite: true,
			},
			stack: {
				format,
				file: stackFile,
				overwrite: true,
			},
		};
		configFile = path.join(__dirname, "..", `serverless.${format}.yml`);
		writeServerlessConfig(configFile, config);

		return () => { removeFiles(configFile); }
	});

	beforeEach(() => {
		removeFiles(envFile, stackFile);

		return () => { removeFiles(envFile, stackFile); }
	});

	test("serverless deploy", async () => {
		const result = await $`sls deploy --config ${configFile}`;
		expect(result.exitCode).toBe(0);

		console.log(result.stdout, result.stderr, result.exitCode);

		expect(fs.existsSync(envFile)).toBe(true);
		expect(fs.existsSync(stackFile)).toBe(true);

		const envContents = fs.readFileSync(envFile, "utf-8").split("\n");
		expect(envContents).toMatchObject(envSnapshot);
		const stackContents = fs.readFileSync(stackFile, "utf-8").split("\n");
		expect(stackContents).toMatchObject(stackSnapshot);
	});

	test("serverless package", async () => {
		const result = await $`sls package --config ${configFile}`;
		expect(result.exitCode).toBe(0);

		expect(fs.existsSync(envFile)).toBe(true);
		expect(fs.existsSync(stackFile)).toBe(false);

		const envContents = fs.readFileSync(envFile, "utf-8").split("\n");
		expect(envContents).toMatchObject(envSnapshot);
	});

	test("serverless info", async () => {
		const result = await $`sls info --config ${configFile}`;
		expect(result.exitCode).toBe(0);

		expect(fs.existsSync(envFile)).toBe(true);
		expect(fs.existsSync(stackFile)).toBe(false);

		const envContents = fs.readFileSync(envFile, "utf-8").split("\n");
		expect(envContents).toMatchObject(envSnapshot);
	});
});

