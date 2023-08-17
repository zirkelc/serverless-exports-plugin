# Serverless Exports Plugin

## Install
Install the plugin as a development dependency in your Serverless project:
```bash
npm install --save-dev serverless-exports-plugin
```

## Usage
Add `serverless-exports-plugin` to the `plugins` section of your `serverless.yml` file and configure the exports you want to generate in the `custom.exports` section.

```yaml
service: serverless-exports-plugin-example
frameworkVersion: '3'

plugins:
  - serverless-exports-plugin

custom:
  exports:
    environment:
      file: ./.env.${sls:stage}
      format: env
      overwrite: true    
    stack:
      file: ./.stack.${sls:stage}
      format: env
      overwrite: true    

provider:
  name: aws
  runtime: nodejs18.x
  environment:
    FOO: bar
    SERVICE: ${self:service}
    STAGE: ${sls:stage}

functions:
  function1:
    handler: index.handler

```