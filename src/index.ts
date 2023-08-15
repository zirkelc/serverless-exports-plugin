import Serverless from "serverless";
import Plugin from "serverless/classes/Plugin";

// https://www.serverless.com/framework/docs/guides/plugins/creating-plugins
export class ServerlessOutputPlugin implements Plugin {
	serverless: Serverless;
	options: Serverless.Options;
	hooks: Plugin.Hooks;
	commands?: Plugin.Commands;
	variableResolvers?: Plugin.VariableResolvers;
	configurationVariablesSources?: Plugin.ConfigurationVariablesSources;
	serviceName: string;
	region: string;
	stage: string;
	stackName: string;

	constructor(serverless: Serverless, options: Serverless.Options) {
		this.serverless = serverless;
		this.options = options || {};
		this.serviceName = serverless.service.getServiceName();
		this.region = serverless.getProvider("aws").getRegion();
		this.stage = serverless.getProvider("aws").getStage();

		if (this.stage.startsWith("$")) this.stage = "dev";
		this.stackName = `${this.serviceName}-${this.stage}`;
		// this.config = serverless.service.custom.exportOutputs;
		// this.log = data => serverless.cli.consoleLog(data);

		this.hooks = {
			"after:deploy:deploy": async () => this.afterDeploy(),
		};
	}

	async afterDeploy() {
		const outputs = this.getStackOutputs();

		// TODO get envs
		// TODO create file

			.then((stackOutputs) => this.collectOutputs(stackOutputs))
			.then((targetOutputs) => this.processOutputs(targetOutputs))
			.then((exportOutputs) => this.createFile(exportOutputs))
			.catch((error) => {
				this.log(error);
			});
	}

	async getStackOutputs() {
		const response = await this.serverless
			.getProvider("aws")
			.request("CloudFormation", "describeStacks", {
				StackName: this.stackName,
			});

		const stack = response.Stacks[0];
		const outputs = stack.Outputs || [];

		return outputs.reduce(
			(acc, { OutputKey, OutputValue }) => ({
				...acc,
				[OutputKey]: OutputValue,
			}),
			{},
		);
	}

	collectOutputs(outputs) {
		if (!this.config) return outputs;

		const isArray = (obj) =>
			Object.prototype.toString.call(obj) === "[object Array]";
		const isObject = (obj) =>
			Object.prototype.toString.call(obj) === "[object Object]";

		const targetOutputKeys = isArray(this.config)
			? this.config
			: this.config.include || [];
		const targetOutputs = {};

		targetOutputKeys.forEach((entry) => {
			let key = entry;
			let obj = outputs;
			if (isObject(entry)) {
				key = Object.keys(entry)[0];
				obj = entry;
			}
			targetOutputs[key] = obj[key];
		});

		return targetOutputs;
	}

	processOutputs(outputs) {
		if (this.config && this.config.handler) {
			const handlerPath = path.resolve(
				__dirname,
				`../../${this.config.handler}`,
			);
			const handler = require(handlerPath);
			return handler(outputs, this.serverless, this.options);
		} else if (this.config && this.config.reactapp === true) {
			return reactAppHandler(outputs);
		} else {
			return outputs;
		}
	}

	createFile(outputs) {
		const path =
			this.config && this.config.output && this.config.output.file
				? this.config.output.file
				: defaultFile;
		const targetFormat =
			this.config && this.config.output && this.config.output.format
				? this.config.output.format
				: defaultFormat;
		let formattedOutputs = null;

		switch (targetFormat.toLowerCase()) {
			case "toml":
				formattedOutputs = tomlify.toToml(outputs);
				break;
			case "yaml":
			case "yml":
				formattedOutputs = yamljs.stringify(outputs);
				break;
			case "json":
				formattedOutputs = JSON.stringify(outputs);
				break;
			default:
				throw new Error(`${targetFormat} is not supported`);
		}

		try {
			fs.writeFileSync(path, formattedOutputs);
		} catch (e) {
			throw new Error(`Failed to create file: ${path}`);
		}

		return Promise.resolve();
	}

	export() {

	}
}
