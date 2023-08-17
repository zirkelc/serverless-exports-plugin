import type { CloudFormation } from "aws-sdk";
import fs from "fs";
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

		console.log(serverless);
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

		this.logging.log.notice("Exporting enviroment...");

		const exports = await this.getEnvironmentVariables();
		this.logging.log.notice("Enviroment: ", exports);

		this.writeFile(exports, this.config.exports.environment);
		this.logging.log.success(
			`Exported enviroment to ${this.config.exports.environment.file} file`,
		);
	}

	async exportStack() {
		if (!this.config.exports.stack) {
			this.logging.log.notice(
				"Config for stack not found. Skipping export for stack outputs.",
			);
			return;
		}

		this.logging.log.notice("Exporting stack...");

		const exports = await this.getStackOutputs();
		this.logging.log.notice("Outputs: ", exports);

		this.writeFile(exports, this.config.exports.stack);
		this.logging.log.success(
			`Exported outputs to ${this.config.exports.stack.file} file`,
		);
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

	writeFile(
		exports: Exports,
		config: ExportsEnvironmentConfig | ExportsOutputsConfig,
	) {
		if (fs.existsSync(config.file) && !config.overwrite)
			throw new Error(
				`File ${config.file} already exists and overwrite is disabled`,
			);

		const { format, file } = config;
		const content = this.format(exports, format);

		this.logging.log.notice(`Writing exports to ${file}...`);
		fs.writeFileSync(file, content);
	}
}

// use default export syntax because Serverless expects that
module.exports = ServerlessOutputPlugin;
