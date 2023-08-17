import { describe, test, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { after, beforeEach } from "node:test";
import { afterAll } from "vitest";
import { $ } from "execa";
import { beforeAll } from "vitest";

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

describe("serverless deploy", () => {
	test("should export environment and stack outputs", async () => {
		const environmentFile = path.join(serverlessDir, "env");
		const stackFile = path.join(serverlessDir, "stack");

		// Remove files from previous tests
		removeFiles(environmentFile, stackFile);

		// Run the 'sls deploy' command
		const result = await $`sls deploy --config ${configFile}`;
		expect(result.exitCode).toBe(0);

		console.log(result.stdout, result.stderr, result.exitCode);

		// Check that the output files were generated
		expect(fs.existsSync(environmentFile)).toBe(true);
		expect(fs.existsSync(stackFile)).toBe(true);
	});
});

describe("serverless package", () => {
	test("should export environment", async () => {
		const environmentFile = path.join(serverlessDir, "env");
		const stackFile = path.join(serverlessDir, "stack");

		// Remove files from previous tests
		removeFiles(environmentFile, stackFile);

		// Run the 'sls deploy' command
		const result = await $`sls package --config ${configFile}`;
		expect(result.exitCode).toBe(0);

		// Check that the output files were generated
		expect(fs.existsSync(environmentFile)).toBe(true);
		expect(fs.existsSync(stackFile)).toBe(false);
	});
});
