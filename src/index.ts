import type { CloudFormation } from "aws-sdk";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import Serverless from "serverless";
import Plugin, { Logging } from "serverless/classes/Plugin";
import {
	ExportsConfig,
	ExportsEnvironmentConfig,
	ExportsOutputsConfig,
	configSchema,
} from "./config";

type Exports = Record<string, string>;

// https://www.serverless.com/framework/docs/guides/plugins/creating-plugins
class ServerlessOutputPlugin implements Plugin {
	serverless: Serverless;

	cliOptions: Serverless.Options;
	// https://gist.github.com/HyperBrain/50d38027a8f57778d5b0f135d80ea406
	hooks: Plugin.Hooks;
	// https://www.serverless.com/framework/docs/guides/plugins/cli-output
	logging: Logging;

	config: ExportsConfig;

	constructor(
		serverless: Serverless,
		cliOptions: Serverless.Options,
		logging: Logging,
	) {
		this.serverless = serverless;
		this.cliOptions = cliOptions || {};
		this.logging = logging;
		this.config = { exports: {} };

		this.hooks = {
			initialize: () => this.init(),
			"package:finalize": async () => this.exportEnvironment(),
			"deploy:finalize": async () => this.exportStack(),
		};

		serverless.configSchemaHandler.defineCustomProperties(configSchema);
	}

	init() {
		this.config = this.serverless.service.custom as ExportsConfig;
	}

	async exportEnvironment() {
		if (!this.config.exports.environment) {
			this.logging.log.notice(
				"Config for environment not found. Skipping export for environment variables.",
			);
			return;
		}

		this.logging.log.verbose("\nExporting enviroment...");
		const exports = await this.getEnvironmentVariables();

		this.write(exports, this.config.exports.environment);
		this.logging.log.success(
			`Exported environment variables to ${this.prettifyFile(
				this.config.exports.environment.file,
			)}`,
		);
		this.logging.log.notice(this.prettifyExports(exports) + "\n");
	}

	async exportStack() {
		if (!this.config.exports.stack) {
			this.logging.log.notice(
				"Config for stack not found. Skipping export for stack outputs.",
			);
			return;
		}

		this.logging.log.verbose("\nExporting stack...");

		const exports = await this.getStackOutputs();
		this.write(exports, this.config.exports.stack);

		this.logging.log.success(
			`Exported stack outputs to ${this.prettifyFile(
				this.config.exports.stack.file,
			)}`,
		);
		this.logging.log.notice(this.prettifyExports(exports));
	}

	async getEnvironmentVariables(): Promise<Exports> {
		const providerVariables =
			"environment" in this.serverless.service.provider
				? (this.serverless.service.provider.environment as Record<
						string,
						string
				  >)
				: {};

		// TODO collect variables from functions
		const functionVariables = {};

		return {
			...providerVariables,
			...functionVariables,
		};
	}

	async getStackOutputs(): Promise<Exports> {
		const aws = this.serverless.getProvider("aws");
		const stackName = aws.naming.getStackName();
		const response: CloudFormation.Types.DescribeStacksOutput =
			await aws.request("CloudFormation", "describeStacks", {
				StackName: stackName,
			});

		if (!response.Stacks) throw new Error(`Stack ${stackName} not found`);

		const [stack] = response.Stacks;
		const outputs = stack.Outputs || [];

		return outputs.reduce<Record<string, string>>(
			(acc, { OutputKey, OutputValue }) => {
				if (!OutputKey) return acc;

				acc[OutputKey] = OutputValue || "";
				return acc;
			},
			{},
		);
	}

	format(exports: Exports, format: string) {
		switch (format.toLowerCase()) {
			case "toml":
				throw new Error("Not implemented yet");

			case "yaml":
				throw new Error("Not implemented yet");

			case "json":
				throw new Error("Not implemented yet");

			case "env":
				return Object.entries(exports)
					.map(([key, value]) => `${key}=${value}`)
					.join("\n");

			default:
				throw new Error(`Format ${format} is not supported`);
		}
	}

	write(
		exports: Exports,
		config: ExportsEnvironmentConfig | ExportsOutputsConfig,
	) {
		if (fs.existsSync(config.file) && !config.overwrite)
			throw new Error(
				`File ${config.file} already exists and overwrite is disabled`,
			);

		const { format, file } = config;
		const content = this.format(exports, format);

		//TODO create directory if it doesn't exist
		fs.writeFileSync(file, content);
	}

	prettifyExports(exports: Exports) {
		return Object.entries(exports)
			.map(([key, value]) => chalk.gray(`  ${key}: ${value}`))
			.join("\n");
	}

	prettifyFile(file: string) {
		return chalk.gray(path.relative(process.cwd(), file));
	}
}

// use default export syntax because Serverless expects that
export = ServerlessOutputPlugin;
