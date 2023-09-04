import { $ } from "execa";
import fs from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

// TODO tests for:
// other formats (json, yaml, toml)
// invalid config

const configFile = path.join(__dirname, "..", "serverless.yml");
const serverlessDir = path.join(__dirname, "..", ".serverless");

const removeDir = (dir: string) => {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true });
	}
};

const removeFiles = (...files: string[]) => {
	files.forEach((file) => fs.existsSync(file) && fs.rmSync(file));
};

beforeAll(() => {
	removeDir(serverlessDir);
});

afterAll(() => {
	removeDir(serverlessDir);
});

const exports = [
	{
		format: "env",
		envFile: path.join(serverlessDir, ".env.dev"),
		stackFile: path.join(serverlessDir, "stack-outputs.txt"),
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
];

describe("serverless deploy", () => {
	test.each(exports)(
		"should export $format file",
		async ({ envFile, stackFile, envSnapshot, stackSnapshot }) => {
			// Remove files from previous tests
			removeFiles(envFile, stackFile);

			// Run the 'sls deploy' command
			const result = await $`sls deploy --config ${configFile}`;
			expect(result.exitCode).toBe(0);

			console.log(result.stdout, result.stderr, result.exitCode);

			// Check that the output files were generated
			expect(fs.existsSync(envFile)).toBe(true);
			expect(fs.existsSync(stackFile)).toBe(true);

			const envContents = fs.readFileSync(envFile, "utf-8").split("\n");
			const stackContents = fs.readFileSync(stackFile, "utf-8").split("\n");
			expect(envContents).toMatchObject(envSnapshot);
			expect(stackContents).toMatchObject(stackSnapshot);
		},
	);
});

describe("serverless package", () => {
	test.each(exports)(
		"should export $format file",
		async ({ envFile, stackFile, envSnapshot }) => {
			// Remove files from previous tests
			removeFiles(envFile, stackFile);

			// Run the 'sls deploy' command
			const result = await $`sls package --config ${configFile}`;
			expect(result.exitCode).toBe(0);

			// Check that the output files were generated
			expect(fs.existsSync(envFile)).toBe(true);
			expect(fs.existsSync(stackFile)).toBe(false);

			const envContents = fs.readFileSync(envFile, "utf-8").split("\n");
			expect(envContents).toMatchObject(envSnapshot);
		},
	);
});

describe("serverless info", () => {
	test.each(exports)(
		"should export $format file",
		async ({ envFile, stackFile, envSnapshot }) => {
			// Remove files from previous tests
			removeFiles(envFile, stackFile);

			// Run the 'sls deploy' command
			const result = await $`sls info --config ${configFile}`;
			expect(result.exitCode).toBe(0);

			// Check that the output files were generated
			expect(fs.existsSync(envFile)).toBe(true);
			expect(fs.existsSync(stackFile)).toBe(false);

			const envContents = fs.readFileSync(envFile, "utf-8").split("\n");
			expect(envContents).toMatchObject(envSnapshot);
		},
	);
});

