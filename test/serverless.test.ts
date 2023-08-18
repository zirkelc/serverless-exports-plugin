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
	}
]

describe("serverless deploy", () => {
	test.each(exports)("should export $format file", async ({
		envFile,
		stackFile,
	}) => {
		// Remove files from previous tests
		removeFiles(envFile, stackFile);

		// Run the 'sls deploy' command
		const result = await $`sls deploy --config ${configFile}`;
		expect(result.exitCode).toBe(0);

		console.log(result.stdout, result.stderr, result.exitCode);

		// Check that the output files were generated
		expect(fs.existsSync(envFile)).toBe(true);
		expect(fs.existsSync(stackFile)).toBe(true);

		expect(fs.readFileSync(envFile, "utf-8")).toMatchSnapshot();
		expect(fs.readFileSync(stackFile, "utf-8")).toMatchSnapshot();
	});
});

describe("serverless package", () => {
	test.each(exports)("should export $format file", async ({
		envFile,
		stackFile,
	}) => {
		// Remove files from previous tests
		removeFiles(envFile, stackFile);

		// Run the 'sls deploy' command
		const result = await $`sls package --config ${configFile}`;
		expect(result.exitCode).toBe(0);

		// Check that the output files were generated
		expect(fs.existsSync(envFile)).toBe(true);
		expect(fs.existsSync(stackFile)).toBe(false);

		expect(fs.readFileSync(envFile, "utf-8")).toMatchSnapshot();
	});
});
