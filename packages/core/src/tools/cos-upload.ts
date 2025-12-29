/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { getErrorMessage } from '../utils/errors.js';
import type { Config } from '../config/config.js';
import { randomUUID } from 'node:crypto';
import COS from 'cos-nodejs-sdk-v5';

export interface CosUploadToolParams {
  upload_message: string;
  file_type?: string;
}

export interface CosUploadToolResult extends ToolResult {
  url?: string;
}

class CosUploadToolInvocation extends BaseToolInvocation<
  CosUploadToolParams,
  CosUploadToolResult
> {
  constructor(
    config: Config,
    params: CosUploadToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    const messageLength = this.params.upload_message?.length ?? 0;
    return `上传 ${messageLength} 字符的文本到腾讯云COS`;
  }

  async execute(_signal: AbortSignal): Promise<CosUploadToolResult> {
    const secretId = process.env['COS_SECRET_ID'];
    const secretKey = process.env['COS_SECRET_KEY'];
    const region = process.env['COS_REGION'] || 'ap-beijing';
    const bucketName = process.env['COS_BUCKET_NAME'];
    const targetDir = process.env['COS_TARGET_DIR'] || 'argos_guard/';

    if (!secretId || !secretKey || !bucketName) {
      const errorMessage =
        '缺少必要的COS配置: COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET_NAME';
      return {
        llmContent: `错误: ${errorMessage}`,
        returnDisplay: '上传失败',
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }

    const fileType = this.params.file_type || 'txt';

    try {
      const cos = new COS({
        SecretId: secretId,
        SecretKey: secretKey,
      });

      const fileName = `${randomUUID().replace(/-/g, '')}_${Date.now()}.${fileType}`;
      const objectKey = `${targetDir}${fileName}`;

      await new Promise<void>((resolve, reject) => {
        cos.putObject(
          {
            Bucket: bucketName,
            Region: region,
            Key: objectKey,
            Body: this.params.upload_message,
          },
          (err, _data) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          },
        );
      });

      const resultUrl = `https://${bucketName}.cos.${region}.myqcloud.com/${objectKey}`;

      return {
        llmContent: `已成功上传到COS，地址是: ${resultUrl}`,
        returnDisplay: `上传成功: ${resultUrl}`,
        url: resultUrl,
      };
    } catch (error: unknown) {
      const errorMessage = `上传COS失败，异常信息: ${getErrorMessage(error)}`;
      console.error(errorMessage, error);
      return {
        llmContent: `错误: ${errorMessage}`,
        returnDisplay: '上传失败',
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
}

export class CosUploadTool extends BaseDeclarativeTool<
  CosUploadToolParams,
  CosUploadToolResult
> {
  static readonly Name = 'cos_upload';

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      CosUploadTool.Name,
      'CosUpload',
      `Uploads content to Tencent Cloud Object Storage (COS) with auto-generated unique filenames. 
      Generates a publicly accessible URL for the uploaded file.

      Key features:
      1. Accepts any string message as input content (max 10MB implied by COS standards)
      2. Automatically generates unique filenames using UUID4 + timestamp format
      3. Stores files in predefined bucket configured via environment variables
      4. Returns HTTPS URL for accessing the uploaded file
      5. Supports any file type - COS SDK automatically handles content type detection
      6. IMPORTANT: Always specify the appropriate file_type parameter based on the content being uploaded

      Parameters:
      - upload_message: (required) Raw content to be uploaded. Supports any UTF-8 string.
      - file_type: (optional) File extension for the uploaded file. Default: 'txt'. 
        IMPORTANT: You MUST set this parameter based on the content type:
        * Python code → 'py'
        * Java code → 'java'
        * JavaScript/TypeScript → 'js' or 'ts'
        * HTML → 'html'
        * CSS → 'css'
        * JSON data → 'json'
        * Markdown → 'md'
        * Plain text → 'txt' (default)
        * Any other file type → use the appropriate extension

      Response format:
      Success: Returns the public URL of the uploaded file
      Error: Returns detailed error information

      Environment variables required:
      - COS_SECRET_ID: Tencent Cloud Secret ID
      - COS_SECRET_KEY: Tencent Cloud Secret Key
      - COS_BUCKET_NAME: COS bucket name (e.g., bucket-name-test-1234535)
      - COS_REGION: COS region (default: ap-beijing)
      - COS_TARGET_DIR: Target directory in COS (default: argos_guard/)`,
      Kind.Other,
      {
        type: 'object',
        properties: {
          upload_message: {
            type: 'string',
            description: '(required) The upload_message is upload cos message.',
          },
          file_type: {
            type: 'string',
            description:
              '(optional) File extension for the uploaded file. Default: "txt". IMPORTANT: You MUST set this parameter based on the content type: Python code → "py", Java code → "java", JavaScript/TypeScript → "js" or "ts", HTML → "html", CSS → "css", JSON → "json", Markdown → "md", Plain text → "txt" (default). Always specify the correct file extension for the content being uploaded.',
          },
        },
        required: ['upload_message'],
      },
      true,
      false,
      messageBus,
    );
  }

  protected override validateToolParamValues(
    params: CosUploadToolParams,
  ): string | null {
    if (!params.upload_message || params.upload_message.trim() === '') {
      return "'upload_message' 参数不能为空";
    }
    return null;
  }

  protected createInvocation(
    params: CosUploadToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<CosUploadToolParams, CosUploadToolResult> {
    return new CosUploadToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
