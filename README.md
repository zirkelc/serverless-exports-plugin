[![CI](https://github.com/zirkelc/serverless-exports-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/zirkelc/serverless-exports-plugin/actions/workflows/ci.yml)
![npm](https://img.shields.io/npm/v/serverless-exports-plugin)
![npm](https://img.shields.io/npm/dt/serverless-exports-plugin)

# Serverless Exports Plugin
This plugin exports environment variables and stack outputs from your Serverless project to local files.
These files can then be used in development or in CI/CD pipelines to set environment variables or use as input for other tools.

![Terminal](https://github.com/zirkelc/serverless-exports-plugin/assets/950244/9e77e49a-fe43-4457-8d5b-4c1942141ee1)

## Usage
Install the plugin as a development dependency in your Serverless project:
```bash
npm install --save-dev serverless-exports-plugin
```

Then add the plugin to your `serverless.yml` file:
```yaml
plugins:
  - serverless-exports-plugin
```

Finally, configure the exports you want to generate:
```yaml
custom:
  exports:
    environment:
      file: .env.${sls:stage}
      format: env 
      overwrite: true
    stack:
      file: stack-outputs.txt
      format: env
      overwrite: true
```

That's it! Now you can run `serverless deploy` or `serverless package` and the plugin will generate the exports for you.

## Configuration
The plugin supports to type of exports: `environment` variables and `stack` outputs.

The configuration for each export is the following:
```yaml
custom:
  exports:
    <environment | stack>:
      file: path/to/file
      format: env # not implemented yet: json | yaml | toml
      overwrite: true | false
```

Only exports that are configured will be generated. There are no default values, so if you want to generate an export you need to configure it.

## Example
The plugin runs during `serverless deploy` and `serverless package` commands. However, the stack outputs are only available after the stack has been deployed. Therefore, the plugin will only generate the stack outputs during `serverless deploy`.

```yaml
service: acme-service
frameworkVersion: '3'

plugins:
  - serverless-exports-plugin

custom:
  exports:
    environment:
      file: .env.${sls:stage}
      format: env
      overwrite: true    
    stack:
      file: stack-outputs.txt
      format: env
      overwrite: true    

provider:
  name: aws
  runtime: nodejs18.x
  environment:
    FOO: bar
    STAGE: ${sls:stage}
    REGION: ${sls:region}
    SERVICE: ${self:service}

functions:
  hello:
    handler: index.handler

resources:
  Resources:
    bucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:service}-${sls:stage}-bucket
  Outputs:
    Foo:
      Value: bar
    BucketName:
      Value: !Ref bucket
```

## Open Points
- [ ] Support for different export formats (json, toml, yaml)
- [ ] Support for a JavaScript handler function to process the exports
- [ ] Collect function-level environment variables and merge with global environment variables
- [ ] Support for include/exclude patterns for variables and outputs

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.
