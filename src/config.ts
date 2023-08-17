import type { FromSchema } from "json-schema-to-ts";

const formats = ["env", "json", "toml", "yaml"] as const;

const configEnvironmentSchema = {
	type: "object",
	properties: {
		overwrite: { type: "boolean", default: false },
		format: { type: "string", default: "env" },
		file: { type: "string", default: ".env" },
	},
	required: ["file", "format", "overwrite"],
} as const;

const configStackSchema = {
	type: "object",
	properties: {
		overwrite: { type: "boolean", default: false },
		format: { type: "string", default: "env" },
		file: { type: "string", default: ".env" },
	},
	required: ["file", "format", "overwrite"],
} as const;

const configSchema = {
	type: "object",
	properties: {
		exports: {
			type: "object",
			properties: {
				environment: configEnvironmentSchema,
				stack: configStackSchema,
			},
		},
	},
	required: ["exports"],
} as const;

export type ExportsConfig = FromSchema<typeof configSchema>;
export type ExportsEnvironmentConfig = FromSchema<
	typeof configEnvironmentSchema
>;
export type ExportsOutputsConfig = FromSchema<typeof configStackSchema>;

export { configSchema };
